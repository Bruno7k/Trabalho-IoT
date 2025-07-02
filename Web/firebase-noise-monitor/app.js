class NoiseMonitorApp {
    constructor() {
        this.isConnected = false;
        this.hasDataMic1 = false;
        this.hasDataMic2 = false;
        this.lastDataMic1 = null;
        this.lastDataMic2 = null;
        this.debugMode = false;
        this.listenerMic1 = null;
        this.listenerMic2 = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeRoomsToWaitingState();
        this.waitForFirebase();
    }

    initializeElements() {
        // Elementos da Sala 1
        this.room1Element = document.getElementById('room1');
        this.room1RmsElement = document.getElementById('room1Rms');
        this.room1StatusElement = document.getElementById('room1Status');
        this.room1AlertElement = document.getElementById('room1Alert');
        this.room1IconElement = document.getElementById('room1Icon');

        // Elementos da Sala 2
        this.room2Element = document.getElementById('room2');
        this.room2RmsElement = document.getElementById('room2Rms');
        this.room2StatusElement = document.getElementById('room2Status');
        this.room2AlertElement = document.getElementById('room2Alert');
        this.room2IconElement = document.getElementById('room2Icon');

        this.connectionStatusElement = document.getElementById('connectionStatus');
        this.lastUpdateElement = document.getElementById('lastUpdate');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.debugBtn = document.getElementById('debugBtn');
        this.debugPanel = document.getElementById('debugPanel');
        this.debugData = document.getElementById('debugData');
    }

    setupEventListeners() {
        this.refreshBtn.addEventListener('click', () => this.refreshConnection());
        this.debugBtn.addEventListener('click', () => this.toggleDebug());
    }

    initializeRoomsToWaitingState() {
        // Inicializa ambas as salas no estado de aguardando dados
        this.setRoomToWaitingState(this.room1Element, this.room1RmsElement, 
                                   this.room1StatusElement, this.room1AlertElement, this.room1IconElement);
        this.setRoomToWaitingState(this.room2Element, this.room2RmsElement, 
                                   this.room2StatusElement, this.room2AlertElement, this.room2IconElement);
        
        this.updateConnectionStatus('🔴 Conectando ao Firebase...', '');
        this.lastUpdateElement.textContent = 'Última atualização: --:--:--';
    }

    setRoomToWaitingState(roomElement, rmsElement, statusElement, alertElement, iconElement) {
        // Remove todas as classes de cor e adiciona cinza
        roomElement.classList.remove('red', 'green');
        roomElement.classList.add('gray');
        
        // Define valores de aguardando
        rmsElement.textContent = '--';
        statusElement.textContent = 'AGUARDANDO';
        alertElement.textContent = 'Aguardando dados...';
        iconElement.textContent = '⚪';
    }

    waitForFirebase() {
        // Aguarda o Firebase estar disponível
        const checkFirebase = () => {
            if (window.firebaseDatabase && window.firebaseRef && window.firebaseOnValue) {
                this.startMonitoring();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    }

    startMonitoring() {
        try {
            // Referência para o microfone 1 (Sala 1)
            const microfone1Ref = window.firebaseRef(window.firebaseDatabase, 'microfone');
            
            // Referência para o microfone 2 (Sala 2)
            const microfone2Ref = window.firebaseRef(window.firebaseDatabase, 'microfone2');
            
            // Configura o listener para o microfone 1
            this.listenerMic1 = window.firebaseOnValue(microfone1Ref, (snapshot) => {
                this.handleFirebaseDataMic1(snapshot);
            }, (error) => {
                this.handleFirebaseErrorMic1(error);
            });

            // Configura o listener para o microfone 2
            this.listenerMic2 = window.firebaseOnValue(microfone2Ref, (snapshot) => {
                this.handleFirebaseDataMic2(snapshot);
            }, (error) => {
                this.handleFirebaseErrorMic2(error);
            });

            this.updateConnectionStatus('🟡 Conectado - Aguardando dados dos microfones...', 'connected');
            console.log('Monitoramento iniciado para ambos os microfones...');
            
        } catch (error) {
            this.handleFirebaseError(error);
        }
    }

    handleFirebaseDataMic1(snapshot) {
        try {
            const data = snapshot.val();
            
            if (data && data.rms !== undefined && data.alerta !== undefined) {
                // Dados válidos recebidos do microfone 1
                this.lastDataMic1 = data;
                this.hasDataMic1 = true;
                
                this.updateConnectionStatusBasedOnData();
                
                // Atualiza a Sala 1 com dados do microfone 1
                this.updateRoom1(data);
                this.updateLastUpdateTime();
                
                console.log('Dados válidos recebidos do Microfone 1 (Sala 1):', data);
            } else {
                // Dados inválidos ou vazios do microfone 1
                console.log('Dados inválidos ou vazios no Microfone 1:', data);
                this.hasDataMic1 = false;
                this.setRoom1ToWaitingState();
                this.updateConnectionStatusBasedOnData();
            }
            
            // Atualiza o debug se estiver ativo
            if (this.debugMode) {
                this.updateDebugData();
            }
            
        } catch (error) {
            console.error('Erro ao processar dados do Microfone 1:', error);
            this.handleFirebaseErrorMic1(error);
        }
    }

    handleFirebaseDataMic2(snapshot) {
        try {
            const data = snapshot.val();
            
            if (data && data.rms !== undefined && data.alerta !== undefined) {
                // Dados válidos recebidos do microfone 2
                this.lastDataMic2 = data;
                this.hasDataMic2 = true;
                
                this.updateConnectionStatusBasedOnData();
                
                // Atualiza a Sala 2 com dados do microfone 2
                this.updateRoom2(data);
                this.updateLastUpdateTime();
                
                console.log('Dados válidos recebidos do Microfone 2 (Sala 2):', data);
            } else {
                // Dados inválidos ou vazios do microfone 2
                console.log('Dados inválidos ou vazios no Microfone 2:', data);
                this.hasDataMic2 = false;
                this.setRoom2ToWaitingState();
                this.updateConnectionStatusBasedOnData();
            }
            
            // Atualiza o debug se estiver ativo
            if (this.debugMode) {
                this.updateDebugData();
            }
            
        } catch (error) {
            console.error('Erro ao processar dados do Microfone 2:', error);
            this.handleFirebaseErrorMic2(error);
        }
    }

    updateConnectionStatusBasedOnData() {
        if (this.hasDataMic1 && this.hasDataMic2) {
            this.updateConnectionStatus('🟢 Conectado - Recebendo dados de ambos os microfones', 'connected');
        } else if (this.hasDataMic1 || this.hasDataMic2) {
            this.updateConnectionStatus('🟡 Conectado - Recebendo dados de um microfone', 'connected');
        } else {
            this.updateConnectionStatus('⚠️ Conectado - Aguardando dados dos microfones', 'error');
        }
    }

    updateRoom1(data) {
        const { rms, alerta } = data;
        
        // Atualiza os valores da Sala 1
        this.room1RmsElement.textContent = parseFloat(rms).toFixed(2);
        this.room1StatusElement.textContent = this.getNoiseStatus(rms);
        this.room1AlertElement.textContent = alerta;

        // Atualiza a cor da sala 1
        this.updateRoomColor(this.room1Element, rms);
        
        // Atualiza o ícone da sala 1
        this.room1IconElement.textContent = rms > 1000 ? '🔴' : '🟢';
        
        console.log(`Sala 1 atualizada - RMS: ${rms}, Status: ${this.getNoiseStatus(rms)}`);
    }

    updateRoom2(data) {
        const { rms, alerta } = data;
        
        // Atualiza os valores da Sala 2
        this.room2RmsElement.textContent = parseFloat(rms).toFixed(2);
        this.room2StatusElement.textContent = this.getNoiseStatus(rms);
        this.room2AlertElement.textContent = alerta;

        // Atualiza a cor da sala 2
        this.updateRoomColor(this.room2Element, rms);
        
        // Atualiza o ícone da sala 2
        this.room2IconElement.textContent = rms > 1000 ? '🔴' : '🟢';
        
        console.log(`Sala 2 atualizada - RMS: ${rms}, Status: ${this.getNoiseStatus(rms)}`);
    }

    updateRoomColor(roomElement, noiseLevel) {
        // Remove classes de cor existentes
        roomElement.classList.remove('red', 'green', 'gray');
        
        // Adiciona a classe apropriada baseada no nível de ruído
        if (noiseLevel > 1000) {
            roomElement.classList.add('red');
        } else if (noiseLevel >= 0) {
            roomElement.classList.add('green');
        } else {
            roomElement.classList.add('gray');
        }
    }

    getNoiseStatus(noiseLevel) {
        if (noiseLevel > 1000) return 'ALTO';
        if (noiseLevel > 700) return 'MÉDIO';
        if (noiseLevel >= 0) return 'BAIXO';
        return 'AGUARDANDO';
    }

    setRoom1ToWaitingState() {
        this.setRoomToWaitingState(this.room1Element, this.room1RmsElement, 
                                   this.room1StatusElement, this.room1AlertElement, this.room1IconElement);
    }

    setRoom2ToWaitingState() {
        this.setRoomToWaitingState(this.room2Element, this.room2RmsElement, 
                                   this.room2StatusElement, this.room2AlertElement, this.room2IconElement);
    }

    setAllRoomsToWaitingState() {
        this.hasDataMic1 = false;
        this.hasDataMic2 = false;
        this.setRoom1ToWaitingState();
        this.setRoom2ToWaitingState();
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('pt-BR');
        this.lastUpdateElement.textContent = `Última atualização: ${timeString}`;
    }

    updateConnectionStatus(message, status = '') {
        this.connectionStatusElement.textContent = message;
        this.connectionStatusElement.className = `connection-status ${status}`;
    }

    handleFirebaseErrorMic1(error) {
        console.error('Erro do Firebase - Microfone 1:', error);
        this.hasDataMic1 = false;
        this.setRoom1ToWaitingState();
        this.updateConnectionStatusBasedOnData();
    }

    handleFirebaseErrorMic2(error) {
        console.error('Erro do Firebase - Microfone 2:', error);
        this.hasDataMic2 = false;
        this.setRoom2ToWaitingState();
        this.updateConnectionStatusBasedOnData();
    }

    handleFirebaseError(error) {
        console.error('Erro geral do Firebase:', error);
        this.isConnected = false;
        this.updateConnectionStatus('🔴 Erro de conexão', 'error');
        this.setAllRoomsToWaitingState();
    }

    refreshConnection() {
        this.updateConnectionStatus('🔄 Reconectando...', '');
        
        // Remove os listeners anteriores se existirem
        if (this.listenerMic1 && window.firebaseOff) {
            window.firebaseOff(this.listenerMic1);
        }
        if (this.listenerMic2 && window.firebaseOff) {
            window.firebaseOff(this.listenerMic2);
        }
        
        // Reinicia o estado de aguardando
        this.initializeRoomsToWaitingState();
        
        // Reinicia o monitoramento
        setTimeout(() => {
            this.startMonitoring();
        }, 1000);
        
        // Feedback visual do botão
        this.refreshBtn.style.background = 'rgba(0, 255, 0, 0.3)';
        setTimeout(() => {
            this.refreshBtn.style.background = 'rgba(255,255,255,0.2)';
        }, 300);
    }

    toggleDebug() {
        this.debugMode = !this.debugMode;
        
        if (this.debugMode) {
            this.debugPanel.style.display = 'block';
            this.debugBtn.textContent = '🐛 Ocultar Debug';
            this.debugBtn.style.background = 'rgba(255, 165, 0, 0.3)';
            
            this.updateDebugData();
        } else {
            this.debugPanel.style.display = 'none';
            this.debugBtn.textContent = '🐛 Debug';
            this.debugBtn.style.background = 'rgba(255,255,255,0.2)';
        }
    }

    updateDebugData() {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            microfone1Data: this.lastDataMic1 || 'Aguardando dados...',
            microfone2Data: this.lastDataMic2 || 'Aguardando dados...',
            connectionStatus: this.isConnected ? 'Conectado' : 'Desconectado',
            hasDataMic1: this.hasDataMic1,
            hasDataMic2: this.hasDataMic2,
            databaseURL: 'https://hpmiotbruno-default-rtdb.firebaseio.com/',
            paths: {
                sala1: '/microfone',
                sala2: '/microfone2'
            },
            note: 'Sala 1 usa dados do /microfone, Sala 2 usa dados do /microfone2'
        };
        
        this.debugData.textContent = JSON.stringify(debugInfo, null, 2);
    }
}

// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log('Iniciando aplicação de monitoramento de ruído...');
    console.log('MODO: Dois microfones independentes - /microfone e /microfone2');
    new NoiseMonitorApp();
});

// Limpa os recursos quando a página for fechada
window.addEventListener('beforeunload', () => {
    console.log('Limpando recursos...');
});

