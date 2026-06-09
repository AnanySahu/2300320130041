
const axios = require('axios');

const LOG_SERVER_URL = 'http://4.224.186.213/evaluation-service/logs';

const ALLOWED_VALUES = {
    stack: ['backend', 'frontend'],
    level: ['debug', 'info', 'warn', 'error', 'fatal'],
    package: [
        'cache', 'controller', 'cron_job', 'db', 'domain',
        'handler', 'repository', 'route', 'service',
        'auth', 'config', 'middleware', 'utils'
    ]
};

async function Log(stack, level, packageName, message) {
  
    const normalizedStack = stack.toLowerCase();
    const normalizedLevel = level.toLowerCase();
    const normalizedPackage = packageName.toLowerCase();

   
    if (!ALLOWED_VALUES.stack.includes(normalizedStack)) {
        console.error(`Invalid stack value: ${stack}. Allowed: ${ALLOWED_VALUES.stack.join(', ')}`);
        return;
    }

   
    if (!ALLOWED_VALUES.level.includes(normalizedLevel)) {
        console.error(`Invalid level value: ${level}. Allowed: ${ALLOWED_VALUES.level.join(', ')}`);
        return;
    }


    if (!ALLOWED_VALUES.package.includes(normalizedPackage)) {
        console.error(`Invalid package value: ${packageName}. Allowed: ${ALLOWED_VALUES.package.join(', ')}`);
        return;
    }

   
    try {
        await axios.post(LOG_SERVER_URL, {
            stack: normalizedStack,
            level: normalizedLevel,
            package: normalizedPackage,
            message: message
        });
    } catch (error) {
        console.error('Failed to send log:', error.message);
    }
}

module.exports = { Log };