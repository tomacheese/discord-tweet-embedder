import { Logger } from '@book000/node-utils'
import { Configuration } from './config'
import { Discord } from './discord'
import { Twitter } from '@book000/twitterts'

async function main() {
  const logger = Logger.configure('main')
  const config = new Configuration('data/config.json')
  config.load()
  if (!config.validate()) {
    logger.error('❌ Configuration is invalid')
    logger.error(
      `💡 Missing check(s): ${config.getValidateFailures().join(', ')}`
    )
    return
  }

  logger.info('🤖 Starting discord-tweet-embedder')

  // login twitter
  logger.info('🔑 Logging in to Twitter...')
  const twitter = await Twitter.login({
    username: config.get('twitter').username,
    password: config.get('twitter').password,
    otpSecret: config.get('twitter').otpSecret,
    puppeteerOptions: {
      executablePath: process.env.CHROMIUM_PATH,
      userDataDirectory: process.env.USER_DATA_DIRECTORY ?? './data/userdata',
    },
  })

  const discord = new Discord(config, twitter)
  process.once('SIGINT', () => {
    logger.info('👋 SIGINT signal received.')
    twitter
      .close()
      .then(() => {
        logger.info('🔑 Logged out from Twitter.')

        return discord.close()
      })
      .then(() => {
        logger.info('🔑 Logged out from Discord.')

        process.exit(0)
      })
      .catch((error: unknown) => {
        logger.error('❌ Failed to logout from Twitter', error as Error)
        process.exit(1)
      })
  })

  // 1日毎に再起動する
  setTimeout(
    () => {
      logger.info('👋 Restarting...')
      twitter
        .close()
        .then(() => {
          logger.info('🔑 Logged out from Twitter.')

          return discord.close()
        })
        .then(() => {
          logger.info('🔑 Logged out from Discord.')

          // eslint-disable-next-line unicorn/no-process-exit
          process.exit(0)
        })
        .catch((error: unknown) => {
          logger.error('❌ Failed to logout from Twitter', error as Error)
          // eslint-disable-next-line unicorn/no-process-exit
          process.exit(1)
        })
    },
    1000 * 60 * 60 * 24
  )
}

;(async () => {
  try {
    await main()
  } catch (error) {
    Logger.configure('main').error('Error', error as Error)
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1)
  }
})()
