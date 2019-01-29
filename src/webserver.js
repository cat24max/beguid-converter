const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const { listenport, post_key_limit, headers } = require(`${__dirname}/../config`)
const convert = require("./converter")

//Swagger Stats
var swStats = require('swagger-stats')
var apiSpec = require('swagger.json')
app.use(swStats.getMiddleware({swaggerSpec:apiSpec}))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use((req, res, next) => {
  Object.keys(headers).forEach(key => res.append(key, headers[key]))
  next()
})

//empty reguest
app.get("/", async (req, res) => {
  res.json({ error: "Please provide either a Steam64 UID or a Battleye GUID! (Format https://beguid-converter.allianceapps.io/v3/<GUID/SteamID64>)"})
})

//be guid to steamid (Legacy v1)
app.get("/:guid([a-f0-9]{32})", async (req, res) => {
  var data = await convert.toSteamId([req.params.guid])
  var steamid = String(Object.values(data)[0])
  if (steamid === null) return res.status(404).json({ error: "No valid steamid found!" })
  res.json({ error: null, data: {guid: req.params.guid, SteamID64: steamid}})
})

//steamid to be guid (Legacy v1)
app.get("/:steamid(\\d{17})", ({ params }, res) => {
  try {
    res.json({ error: null, data: {guid: convert.toGuid([BigInt(params.steamid)])[params.steamid], SteamID64: params.steamid }})
  } catch(e) {
    res.sendStatus(500)
    console.error(e)
  }
})



//be guid to steamid Legacy v2
app.get("/v2/:guid([a-f0-9]{32})", async (req, res) => {
  var data = await convert.toSteamId([req.params.guid])
  var steamid = String(Object.values(data)[0])
  if (steamid === null) return res.status(404).json({ error: false, data: [{src: req.params.guid, guid: req.params.guid, steamid: "", error: "No valid steamid found!"}]})
  res.json({ error: false, data: [{src: req.params.guid, guid: req.params.guid, steamid: steamid}]})
})

//steamid to be guid Legacy v2
app.get("/v2/:steamid(\\d{17})", ({ params }, res) => {
  try {
    res.json({ error: false, data: [{src: params.steamid, guid: convert.toGuid([BigInt(params.steamid)])[params.steamid], steamid: params.steamid }]})
  } catch(e) {
    res.status(404).json({ error: false, data: [{src: params.steamid, guid: "", steamid: params.steamid, error: "No valid steamid found!"}]})
    console.error(e)
  }
})

//be guid to steamid v3
app.get("/v2/:guid([a-f0-9]{32})", async (req, res) => {
  var data = await convert.toSteamId([req.params.guid])
  var steamid = String(Object.values(data)[0])
  if (steamid === null) return res.status(404).json({ error: false, data: {src: req.params.guid, guid: req.params.guid, steamid: "", error: "No valid steamid found!"}})
  res.json({ error: false, data: {src: req.params.guid, guid: req.params.guid, steamid: steamid}})
})

//steamid to be guid v3
app.get("/v2/:steamid(\\d{17})", ({ params }, res) => {
  try {
    res.json({ error: false, data: {src: params.steamid, guid: convert.toGuid([BigInt(params.steamid)])[params.steamid], steamid: params.steamid }})
  } catch(e) {
    res.status(404).json({ error: false, data: {src: params.steamid, guid: "", steamid: params.steamid, error: "No valid steamid found!"}})
    console.error(e)
  }
})


//post v1
app.post("/", async (req, res) => {
  res.status(404).json({ error: "API version v1 does not support POST requests. Please use /v3."})
})


//post v2
app.post("/", async (req, res) => {
  res.status(404).json({ error: "API version v2 does not support POST requests (yet). Please use /v3."})
})

//multiple steamids or beguids
app.post("/v3", ({ body }, res, next) => {
  if (!Array.isArray(body))
    return res.status(400).json({ error: "Body needs to be an array" })
  if (body.length > post_key_limit)
    return res.status(400).json({ error: `Body exceeds the limit of ${post_key_limit} entries` })
  if (body.some(res => (typeof res !== "string" || !/^([a-f0-9]{32}|\d{17})$/.test(res))))
    return res.status(400).json({ error: "A value in the body did not match the following pattern: ^([a-f0-9]{32}|\\d{17})$" })
  next()
}, async ({ body }, res) => {
  var data = {}
  var guids = []
  var steamids = []
  body.forEach(key => {
    if (key.length === 32) return guids.push(key)
    return steamids.push(BigInt(key))
  })
  if (guids.length > 0) data = await convert.toSteamId(guids)
  if (steamids.length > 0) data = { ...data, ...convert.toGuid(steamids) }
  Object.keys(data).forEach(k => {
    if (typeof data[k] === "bigint") data[k] = String(data[k])
  })
  res.json({ data })
})

app.use((req, res) => res.status(400).json({ error: "No matching route found!" }))
app.listen(listenport, () => console.log(`Webserver running on Port ${listenport}`))
