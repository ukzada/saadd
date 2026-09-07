/**
 * Vercel serverless function entry point.
 * All traffic is routed here via the rewrite rule in vercel.json.
 * The Express app (with Nest fully initialised) is created once on the
 * first cold invocation and reused across warm invocations.
 */
const { bootstrapServerless } = require('../dist/serverless');

let appPromise;

module.exports = async (req, res) => {
  if (!appPromise) {
    appPromise = bootstrapServerless().catch((err) => {
      appPromise = undefined; // allow retry on next invocation
      throw err;
    });
  }
  const app = await appPromise;
  return app(req, res);
};
