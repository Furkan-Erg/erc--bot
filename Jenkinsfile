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
            // Sunucuya yalnız main'in build'i çıkar. Job çok dallı değil (BRANCH_NAME boş), bu yüzden
            // `when { branch 'main' }` yerine SCM'in verdiği GIT_BRANCH'e ("origin/main") bakılıyor.
            when {
                expression { env.GIT_BRANCH in ['origin/main', 'main'] || env.BRANCH_NAME == 'main' }
            }
            steps {
                sh '''
                    cd /home/furkan/ercu-bot
                    git pull
                    docker compose up -d --build

                    # Her build'in bıraktığı eski imajları temizle ki disk dolmasın: askıda kalan katmanlar ve son 3
                    # dışındaki ercu-bot:<build no> etiketleri. Başarısız olursa deploy'u bozmasın.
                    docker image prune -f || true
                    docker images ercu-bot --format '{{.Tag}}' | grep -E '^[0-9]+$' | sort -rn | tail -n +4 | xargs -r -I{} docker rmi ercu-bot:{} || true
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
