const axios = require('axios');

const LOG_SERVER_URL = 'http://4.224.186.213/evaluation-service/logs';

// Your actual token
const TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJhbmFueS4yM2IwMTMxMTE1QGFiZXMuYWMuaW4iLCJleHAiOjE3ODA5OTMwOTMsImlhdCI6MTc4MDk5MjE5MywiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6IjNiNWY3NGJmLWE3MDAtNGM0MS04Y2YxLWIyODk3ZmUxMjUyOSIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6ImFuYW55IHNhaHUiLCJzdWIiOiI4MTYyMjgxOC0xYmMyLTRmNzYtYjUxMy1hOGU5YjY0N2NiMjgifSwiZW1haWwiOiJhbmFueS4yM2IwMTMxMTE1QGFiZXMuYWMuaW4iLCJuYW1lIjoiYW5hbnkgc2FodSIsInJvbGxObyI6IjIzMDAzMjAxMzAwNDEiLCJhY2Nlc3NDb2RlIjoiY1h1cWh0IiwiY2xpZW50SUQiOiI4MTYyMjgxOC0xYmMyLTRmNzYtYjUxMy1hOGU5YjY0N2NiMjgiLCJjbGllbnRTZWNyZXQiOiJQWkVGUU14dVhZR2NSbVBoIn0.3RZUVbilEPFIRVv9fc0vRiwF2lFVfWlUCrZks6By9tg';

const ALLOWED_VALUES = {
    stack: ['backend', 'frontend'],
    level: ['debug', 'info', 'warn', 'error', 'fatal'],
    package: ['cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service', 'auth', 'config', 'middleware', 'utils']
};

async function Log(stack, level, packageName, message) {
    const normalizedStack = stack.toLowerCase();
    const normalizedLevel = level.toLowerCase();
    const normalizedPackage = packageName.toLowerCase();

    if (!ALLOWED_VALUES.stack.includes(normalizedStack) ||
        !ALLOWED_VALUES.level.includes(normalizedLevel) ||
        !ALLOWED_VALUES.package.includes(normalizedPackage)) {
        return;
    }

    try {
        await axios.post(LOG_SERVER_URL, {
            stack: normalizedStack,
            level: normalizedLevel,
            package: normalizedPackage,
            message: message
        }, {
            headers: {
                'Authorization': TOKEN
            }
        });
    } catch (error) {
        // Silent fail
    }
}

module.exports = { Log };