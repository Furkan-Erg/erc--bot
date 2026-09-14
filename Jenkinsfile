pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
    }

    stages {
        stage('Install dependenciess') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Syntax check') {
            steps {
                sh 'find src -name "*.js" -print0 | xargs -0 -n1 node --check'
            }
        }

        stage('Docker build') {
            steps {
                sh 'docker build -t ercu-bot:${BUILD_NUMBER} .'
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    cd /home/furkan/ercu-bot
                    git pull
                    docker compose up -d --build
                '''
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
