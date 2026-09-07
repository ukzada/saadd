/**
 * Vercel serverless function entry point.
 * All traffic is routed here via the rewrite rule in vercel.json.
 * The Express app (with Nest fully initialised) is created once on the
 * first cold invocation and reused across warm invocations.
 *
 * Startup failures are logged with the full stack (visible in Vercel logs)
 * and answered with a useful 500 JSON body instead of an opaque
 * FUNCTION_INVOCATION_FAILED crash page.
 */
const { bootstrapServerless } = require('../dist/serverless');

let appPromise;

function sendInitError(res, err) {
  // Full stack to Vercel logs - never swallowed.
  console.error('[api/index] Serverless bootstrap failed:', err && err.stack ? err.stack : err);
  if (!res.headersSent) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    const hint =
      !process.env.DATABASE_URL
        ? 'Missing environment variable DATABASE_URL (Vercel -> Settings -> Environment Variables).'
        : err && err.message
          ? err.message
          : 'Unknown bootstrap error';
    res.end(
      JSON.stringify({
        success: false,
        message: 'API failed to initialise on this invocation.',
        reason: hint,
      }),
    );
  }
}

module.exports = async (req, res) => {
  try {
    if (!appPromise) {
      appPromise = bootstrapServerless().catch((err) => {
        appPromise = undefined; // allow retry on next invocation
        throw err;
      });
    }
    const app = await appPromise;
    return app(req, res);
  } catch (err) {
    sendInitError(res, err);
  }
};
