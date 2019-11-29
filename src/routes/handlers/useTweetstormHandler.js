const debug = require('debug')(
  'tweries-api:routes/handlers/useTweetstormHandler.js'
);
const { name, version } = require('../../../package.json');
const { insert } = require('../../db/index');
const asyncForEach = require('../asyncForEach');
const createTweet = require('../createTweet');
const getAuth0AccessToken = require('../getAuth0AccessToken');
const getTwitterTokens = require('../getTwitterTokens');
const makeT = require('../makeT');

const {
  AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET,
  AUTH0_DOMAIN,
  BYPASS
} = process.env;

async function send({ ids, items, message, req, res, userId }) {
  const response = {
    env: req.app.get('env'),
    ids,
    items,
    message,
    name,
    timestamp: Date.now(),
    userId,
    version
  };
  if (BYPASS === 'true') {
    res.send(response);
  } else {
    const { error, result } = await insert(response);
    res.send({ ...response, error, result });
  }
}

// eslint-disable-next-line no-unused-vars
async function useTweetstormHandler(req, res, next) {
  const {
    body: { items, userId }
  } = req;

  const ids = [];
  if (BYPASS === 'true') {
    debug('BYPASS');
  } else {
    const auth0AccessToken = await getAuth0AccessToken({
      clientId: AUTH0_CLIENT_ID,
      clientSecret: AUTH0_CLIENT_SECRET,
      domain: AUTH0_DOMAIN
    });

    const {
      accessToken: twitterAccessToken,
      accessTokenSecret: twitterAccessTokenSecret
    } = await getTwitterTokens({
      auth0AccessToken,
      domain: AUTH0_DOMAIN,
      userId
    });

    const T = makeT({
      accessToken: twitterAccessToken,
      accessTokenSecret: twitterAccessTokenSecret
    });

    let inReplyToStatusId = null;
    await asyncForEach(items, async item => {
      const tweet = await createTweet({
        inReplyToStatusId,
        status: item.tweet,
        T
      });
      inReplyToStatusId = tweet.data.id_str;
      ids.push(inReplyToStatusId);
    });
  }

  await send({
    ids,
    items,
    message: '👌',
    req,
    res,
    userId
  });
}

module.exports = useTweetstormHandler;
