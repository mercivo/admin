import http from 'node:http';
import { spawn } from 'node:child_process';

const publicPort = Number(process.env.PORT || 8080);
const applicationPort = 3000;
let applicationReady = false;
let stopping = false;

const gateway = http.createServer((request, response) => {
  if (!applicationReady) {
    response.writeHead(503, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': '5',
    });
    response.end(JSON.stringify({ statusCode: 503, message: 'API 正在初始化数据库，请稍后重试。' }));
    return;
  }

  const upstream = http.request({
    hostname: '127.0.0.1',
    port: applicationPort,
    path: request.url,
    method: request.method,
    headers: request.headers,
  }, upstreamResponse => {
    response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  upstream.on('error', error => {
    console.error(`API gateway upstream error: ${error.message}`);
    if (!response.headersSent) response.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ statusCode: 502, message: 'API 服务暂时不可用。' }));
  });
  request.pipe(upstream);
});

gateway.listen(publicPort, '0.0.0.0', () => {
  console.log(`Startup gateway listening on 0.0.0.0:${publicPort}`);
  if (process.env.DB_PREPARE_ON_START === 'true') prepareDatabase();
  else startApplication();
});

let child;
function run(command, args, environment = process.env) {
  return new Promise((resolve, reject) => {
    child = spawn(command, args, { stdio: 'inherit', env: environment });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      child = undefined;
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${signal || code}`));
    });
  });
}

async function waitForApplication(attempts = 60) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${applicationPort}/healthz`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('NestJS did not become healthy on the internal port');
}

async function prepareDatabase() {
  try {
    console.log('Preparing database before starting NestJS');
    await run('/app/start-api.sh', []);
    console.log('Database preparation completed');
    await startApplication();
  } catch (error) {
    fatal(error);
  }
}

async function startApplication() {
  try {
    console.log(`Starting NestJS on internal port ${applicationPort}`);
    child = spawn('node', ['dist/main.js'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: String(applicationPort), DB_SCHEMA_BOOTSTRAP: 'false' },
    });
    child.once('error', fatal);
    child.once('exit', (code, signal) => {
      if (!stopping) fatal(new Error(`NestJS exited with ${signal || code}`));
    });
    await waitForApplication();
    applicationReady = true;
    console.log(`API ready; gateway forwarding ${publicPort} -> ${applicationPort}`);
  } catch (error) {
    fatal(error);
  }
}

function fatal(error) {
  console.error('API startup failed:', error);
  stopping = true;
  child?.kill('SIGTERM');
  gateway.close(() => process.exit(1));
  setTimeout(() => process.exit(1), 1000).unref();
}

function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  applicationReady = false;
  child?.kill(signal);
  gateway.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 9000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
