const core = require('@actions/core')
const aws = require('aws-sdk')
const fs = require('fs')

const outputPath   = core.getInput('OUTPUT_PATH')
const outputFormat = core.getInput('OUTPUT_FORMAT')
const secretNames  = core.getInput('SECRET_NAMES')

const secretsManager = new aws.SecretsManager({
  accessKeyId: core.getInput('AWS_ACCESS_KEY_ID'),
  secretAccessKey: core.getInput('AWS_SECRET_ACCESS_KEY'),
  region: core.getInput('AWS_DEFAULT_REGION')
})

async function getSecretValue (secretsManager, secretNames) {
  var merged = {}
  for (const secretName in secretNames) {
    Object.assign(merged, secretsManager.getSecretValue({ SecretId: secretName }).SecretString)
  }
  return merged
}

getSecretValue(secretsManager, secretNames).then(resp => {
  const secretString = resp
  core.setSecret(secretString)

  if (secretString == null) {
    core.warning(`${secretNames} has no secret values`)
    return
  }

  try {
    const parsedSecret = JSON.parse(secretString)
    // Object.entries(parsedSecret).forEach(([key, value]) => {
    //   core.setSecret(value)
    //   core.exportVariable(key, value)
    // })
    if (outputPath) {
      if (outputFormat && outputFormat == 'JSON') {
        fs.writeFileSync(outputPath, secretString)
      } else {
        const secretsAsEnv = Object.entries(parsedSecret).map(([key, value]) => `${key}=${value}`).join('\n')
        fs.writeFileSync(outputPath, secretsAsEnv)
      }
    }
  } catch (e) {
    core.warning('Parsing asm secret is failed. Secret will be store in asm_secret')
    core.exportVariable('asm_secret', secretString)
    if (outputPath) {
      fs.writeFileSync(outputPath, secretString)
    }
  }
}).catch(err => {
  core.setFailed(err)
})

exports.getSecretValue = getSecretValue
