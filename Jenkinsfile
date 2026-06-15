pipeline {
  agent any

  environment {
    APP_NAME       = 'ai-notes'
    DOCKER_NETWORK = 'ci-cd-network'
    NGINX_CONTAINER = 'nginx-proxy'
  }

  stages {

    stage('Checkout') {
      steps {
        echo "Build #${BUILD_NUMBER} — branch: ${env.GIT_BRANCH ?: 'main'}"
        sh 'ls -la'
      }
    }

    stage('Build Images') {
      steps {
        sh "docker build -t ${APP_NAME}-backend:${BUILD_NUMBER}  ./app/backend"
        sh "docker build -t ${APP_NAME}-frontend:${BUILD_NUMBER} ./app/frontend"
      }
    }

    stage('Run Tests') {
      steps {
        sh """
          docker run --rm \
            --name ${APP_NAME}-test-${BUILD_NUMBER} \
            -e NODE_ENV=test \
            ${APP_NAME}-backend:${BUILD_NUMBER} \
            npm test
        """
      }
    }

    stage('Deploy (Blue-Green)') {
      steps {
        withCredentials([string(credentialsId: 'gemini-api-key', variable: 'GEMINI_API_KEY')]) {
          sh """
            chmod +x scripts/deploy.sh
            APP_NAME=${APP_NAME} \
            APP_VERSION=${BUILD_NUMBER} \
            DOCKER_NETWORK=${DOCKER_NETWORK} \
            NGINX_CONTAINER=${NGINX_CONTAINER} \
            GEMINI_API_KEY=\${GEMINI_API_KEY} \
            ./scripts/deploy.sh
          """
        }
      }
    }

    stage('Verify') {
      steps {
        sh """
          chmod +x scripts/health-check.sh
          APP_NAME=${APP_NAME} \
          DOCKER_NETWORK=${DOCKER_NETWORK} \
          ./scripts/health-check.sh
        """
      }
    }
  }

  post {
    success {
      echo """
      ✅ Build #${BUILD_NUMBER} DEPLOYED SUCCESSFULLY
         App is live → http://localhost:80
      """
    }
    failure {
      echo """
      ❌ Build #${BUILD_NUMBER} FAILED
         The previous version is still running — zero downtime.
         Check the stage that failed above for details.
      """
    }
    always {
      // Clean up only the test/build-tagged image, keep color-tagged ones
      sh """
        docker rmi ${APP_NAME}-backend:${BUILD_NUMBER}  2>/dev/null || true
        docker rmi ${APP_NAME}-frontend:${BUILD_NUMBER} 2>/dev/null || true
      """
    }
  }
}
