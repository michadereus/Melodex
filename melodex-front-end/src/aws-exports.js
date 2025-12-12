// File: src/aws-exports.js

const awsconfig = {
  // Legacy-style fields (keep them so nothing else breaks)
  aws_project_region: "us-east-1",
  aws_cognito_identity_pool_id:
    "us-east-1:a7eb6b51-f11e-4867-ac84-6f0d043a6f65",
  aws_cognito_region: "us-east-1",
  aws_user_pools_id: "us-east-1_NDrWmC0M9",
  aws_user_pools_web_client_id: "706qcim5329kgn132129rdb6hi",
  oauth: {
    domain: "songranker0f57bee6-0f57bee6-dev.auth.us-east-1.amazoncognito.com",
    scope: [
      "phone",
      "email",
      "openid",
      "profile",
      "aws.cognito.signin.user.admin",
    ],
    redirectSignIn: "https://melodx.io/oauth2/idpresponse",
    redirectSignOut: "https://melodx.io/login/",
    responseType: "code",
  },
  federationTarget: "COGNITO_USER_POOLS",
  aws_cognito_username_attributes: ["EMAIL"],
  aws_cognito_social_providers: ["GOOGLE"],
  aws_cognito_signup_attributes: ["EMAIL"],
  aws_cognito_mfa_configuration: "OFF",
  aws_cognito_mfa_types: ["SMS"],
  aws_cognito_password_protection_settings: {
    passwordPolicyMinLength: 8,
    passwordPolicyCharacters: [],
  },
  aws_cognito_verification_mechanisms: ["EMAIL"],
  aws_user_files_s3_bucket:
    "songranker168d4c9071004e018de33684bf3c094ede93a-dev",
  aws_user_files_s3_bucket_region: "us-east-1",

  // New-style explicit categories (this is the important bit)
  Auth: {
    region: "us-east-1",
    userPoolId: "us-east-1_NDrWmC0M9",
    userPoolWebClientId: "706qcim5329kgn132129rdb6hi",
    identityPoolId: "us-east-1:a7eb6b51-f11e-4867-ac84-6f0d043a6f65",
    mandatorySignIn: true,
    oauth: {
      domain:
        "songranker0f57bee6-0f57bee6-dev.auth.us-east-1.amazoncognito.com",
      scope: [
        "phone",
        "email",
        "openid",
        "profile",
        "aws.cognito.signin.user.admin",
      ],
      redirectSignIn: "https://melodx.io/oauth2/idpresponse",
      redirectSignOut: "https://melodx.io/login/",
      responseType: "code",
    },
  },

  Storage: {
    AWSS3: {
      bucket: "songranker168d4c9071004e018de33684bf3c094ede93a-dev",
      region: "us-east-1",
    },
  },
};

export default awsconfig;
