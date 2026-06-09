const express = require('express');
const axios = require('axios');
const { Log } = require('../logging_middleware/index');

const app = express();
const PORT = 3000;

// Your actual token
const TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJhbmFueS4yM2IwMTMxMTE1QGFiZXMuYWMuaW4iLCJleHAiOjE3ODA5OTMwOTMsImlhdCI6MTc4MDk5MjE5MywiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6IjNiNWY3NGJmLWE3MDAtNGM0MS04Y2YxLWIyODk3ZmUxMjUyOSIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6ImFuYW55IHNhaHUiLCJzdWIiOiI4MTYyMjgxOC0xYmMyLTRmNzYtYjUxMy1hOGU5YjY0N2NiMjgifSwiZW1haWwiOiJhbmFueS4yM2IwMTMxMTE1QGFiZXMuYWMuaW4iLCJuYW1lIjoiYW5hbnkgc2FodSIsInJvbGxObyI6IjIzMDAzMjAxMzAwNDEiLCJhY2Nlc3NDb2RlIjoiY1h1cWh0IiwiY2xpZW50SUQiOiI4MTYyMjgxOC0xYmMyLTRmNzYtYjUxMy1hOGU5YjY0N2NiMjgiLCJjbGllbnRTZWNyZXQiOiJQWkVGUU14dVhZR2NSbVBoIn0.3RZUVbilEPFIRVv9fc0vRiwF2lFVfWlUCrZks6By9tg';


const DEPOT_API = 'http://4.224.186.213/evaluation-service/depots';
const VEHICLES_API = 'http://4.224.186.213/evaluation-service/vehicles';


app.use(express.json());


app.use(async (req, res, next) => {
    await Log('backend', 'info', 'middleware', `Incoming ${req.method} request to ${req.path}`);
    next();
});


function solveKnapsack(vehicles, mechanicHours) {
    const n = vehicles.length;
    const dp = Array(n + 1).fill().map(() => Array(mechanicHours + 1).fill(0));
    
    for (let i = 1; i <= n; i++) {
        for (let hours = 0; hours <= mechanicHours; hours++) {
            const duration = vehicles[i-1].duration;
            const impact = vehicles[i-1].impact;
            
            if (duration <= hours) {
                dp[i][hours] = Math.max(dp[i-1][hours], dp[i-1][hours - duration] + impact);
            } else {
                dp[i][hours] = dp[i-1][hours];
            }
        }
    }
    
   
    let remaining = mechanicHours;
    const selected = [];
    for (let i = n; i > 0 && remaining > 0; i--) {
        if (dp[i][remaining] !== dp[i-1][remaining]) {
            selected.push(vehicles[i-1]);
            remaining -= vehicles[i-1].duration;
        }
    }
    
    return {
        maxImpact: dp[n][mechanicHours],
        selectedVehicles: selected.reverse(),
        totalDuration: selected.reduce((sum, v) => sum + v.duration, 0)
    };
}


app.get('/depots', async (req, res) => {
    const startTime = Date.now();
    await Log('backend', 'info', 'controller', 'GET /depots called');
    
    try {
        const response = await axios.get(DEPOT_API, {
            headers: { 'Authorization': TOKEN }
        });
        
        const responseTime = Date.now() - startTime;
        await Log('backend', 'info', 'controller', `GET /depots completed in ${responseTime}ms`);
        
        res.json({
            success: true,
            responseTime: `${responseTime}ms`,
            data: response.data
        });
    } catch (error) {
        await Log('backend', 'error', 'controller', `GET /depots failed: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.response?.data 
        });
    }
});


app.get('/schedule/:depotId', async (req, res) => {
    const startTime = Date.now();
    const { depotId } = req.params;
    
    await Log('backend', 'info', 'controller', `GET /schedule/${depotId} called`);
    
    try {
       
        const [depotsRes, vehiclesRes] = await Promise.all([
            axios.get(DEPOT_API, { headers: { 'Authorization': TOKEN } }),
            axios.get(VEHICLES_API, { headers: { 'Authorization': TOKEN } })
        ]);
        
        const depot = depotsRes.data.depots.find(d => d.ID == depotId);
        if (!depot) {
            await Log('backend', 'warn', 'controller', `Depot ${depotId} not found`);
            return res.status(404).json({ success: false, error: 'Depot not found' });
        }
        
       
        const vehicles = vehiclesRes.data.vehicles.map(v => ({
            taskId: v.TaskID,
            duration: v.Duration,
            impact: v.Impact
        }));
        
        const result = solveKnapsack(vehicles, depot.MechanicHours);
        const responseTime = Date.now() - startTime;
        
        await Log('backend', 'info', 'controller', `Schedule for depot ${depotId} completed in ${responseTime}ms, Max Impact: ${result.maxImpact}`);
        
        res.json({
            success: true,
            depotId: parseInt(depotId),
            mechanicHours: depot.MechanicHours,
            responseTime: `${responseTime}ms`,
            result: {
                maxTotalImpact: result.maxImpact,
                totalDuration: result.totalDuration,
                vehiclesSelected: result.selectedVehicles.length,
                selectedVehicles: result.selectedVehicles
            }
        });
        
    } catch (error) {
        await Log('backend', 'error', 'controller', `GET /schedule/${depotId} failed: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.response?.data 
        });
    }
});


app.post('/optimize', async (req, res) => {
    const startTime = Date.now();
    const { mechanicHours } = req.body;
    
    await Log('backend', 'info', 'controller', 'POST /optimize called');
    
    if (!mechanicHours) {
        await Log('backend', 'warn', 'controller', 'Missing mechanicHours in request body');
        return res.status(400).json({ success: false, error: 'mechanicHours is required in request body' });
    }
    
    try {
        const vehiclesRes = await axios.get(VEHICLES_API, {
            headers: { 'Authorization': TOKEN }
        });
        
        
        const vehicles = vehiclesRes.data.vehicles.map(v => ({
            taskId: v.TaskID,
            duration: v.Duration,
            impact: v.Impact
        }));
        
        const result = solveKnapsack(vehicles, mechanicHours);
        const responseTime = Date.now() - startTime;
        
        await Log('backend', 'info', 'controller', `Custom optimization completed in ${responseTime}ms, Max Impact: ${result.maxImpact}`);
        
        res.json({
            success: true,
            inputMechanicHours: mechanicHours,
            responseTime: `${responseTime}ms`,
            result: {
                maxTotalImpact: result.maxImpact,
                totalDuration: result.totalDuration,
                vehiclesSelected: result.selectedVehicles.length,
                selectedVehicles: result.selectedVehicles
            }
        });
        
    } catch (error) {
        await Log('backend', 'error', 'controller', `POST /optimize failed: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.response?.data 
        });
    }
});


app.get('/debug/vehicles', async (req, res) => {
    try {
        const response = await axios.get(VEHICLES_API, {
            headers: { 'Authorization': TOKEN }
        });
        
        res.json({
            totalVehicles: response.data.vehicles.length,
            sampleVehicle: response.data.vehicles[0],
            allVehicles: response.data.vehicles.slice(0, 5)
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});


app.get('/health', async (req, res) => {
    await Log('backend', 'debug', 'controller', 'Health check called');
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


app.listen(PORT, async () => {
    await Log('backend', 'info', 'service', `Vehicle scheduler API running on port ${PORT}`);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('\nAvailable endpoints:');
    console.log('GET  /depots              - Get all depots');
    console.log('GET  /schedule/:depotId   - Get optimal schedule for a depot');
    console.log('POST /optimize            - Custom optimization with body: { "mechanicHours": 60 }');
    console.log('GET  /debug/vehicles      - Debug vehicle data');
    console.log('GET  /health              - Health check');
});