// Habilitando funções da biblioteca
#define ENABLE_USER_AUTH
#define ENABLE_DATABASE

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <FirebaseClient.h>
#include <driver/i2s.h>
#include <cmath>

// Wi-Fi
#define WIFI_SSID "Bruno"
#define WIFI_PASSWORD "oficina12"

// Firebase
#define Web_API_KEY "AIzaSyBeSx8HVZ9qD3-t1-Ww2SoA27UnDmhIKtw"
#define DATABASE_URL "https://hpmiotbruno-default-rtdb.firebaseio.com/"
#define USER_EMAIL "gabriel@email.com"
#define USER_PASS "123456"

// Firebase objetos
UserAuth user_auth(Web_API_KEY, USER_EMAIL, USER_PASS);
FirebaseApp app;
WiFiClientSecure ssl_client;
AsyncClientClass aClient(ssl_client);
RealtimeDatabase Database;

// Callback de resultado
void processaResultados(AsyncResult &aResult) {
  if (!aResult.isResult()) return;

  if (aResult.isEvent())
    Firebase.printf("Evento: %s, msg: %s, code: %d\n",
                    aResult.uid().c_str(),
                    aResult.eventLog().message().c_str(),
                    aResult.eventLog().code());

  if (aResult.isDebug())
    Firebase.printf("Debug: %s, msg: %s\n",
                    aResult.uid().c_str(),
                    aResult.debug().c_str());

  if (aResult.isError())
    Firebase.printf("Erro: %s, msg: %s, code: %d\n",
                    aResult.uid().c_str(),
                    aResult.error().message().c_str(),
                    aResult.error().code());

  if (aResult.available())
    Firebase.printf("Dados: %s, payload: %s\n",
                    aResult.uid().c_str(),
                    aResult.c_str());
}

// I2S e microfone INMP441
#define I2S_WS   25
#define I2S_SD   33
#define I2S_SCK  32
#define I2S_PORT I2S_NUM_0
#define BUFFER_LEN 32
int16_t i2sBuffer[BUFFER_LEN];
#define NUM_SAMPLES 100

// Tempo entre envios
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 1000;

// Funções de I2S
void i2s_install() {
  i2s_config_t i2s_config = {
    .mode = i2s_mode_t(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 44100,
    .bits_per_sample = i2s_bits_per_sample_t(16),
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = i2s_comm_format_t(I2S_COMM_FORMAT_STAND_I2S),
    .intr_alloc_flags = 0,
    .dma_buf_count = 8,
    .dma_buf_len = BUFFER_LEN,
    .use_apll = false
  };

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
}

void i2s_setpin() {
  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = -1,
    .data_in_num = I2S_SD
  };

  i2s_set_pin(I2S_PORT, &pin_config);
}

// Setup principal
void setup() {
  Serial.begin(115200);
  delay(100);

  // Conectar Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando ao Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nWi-Fi conectado");

  // Firebase: configurar SSL
  ssl_client.setInsecure();
  ssl_client.setConnectionTimeout(1000);
  ssl_client.setHandshakeTimeout(5);

  // Inicializar Firebase
  initializeApp(aClient, app, getAuth(user_auth), processaResultados, "Auth");
  app.getApp<RealtimeDatabase>(Database);
  Database.url(DATABASE_URL);

  // Inicializar microfone I2S
  i2s_install();
  i2s_setpin();
  i2s_start(I2S_PORT);
}

// Loop principal
void loop() {
  app.loop(); 

  if (app.ready()) {
    unsigned long currentTime = millis();
    if (currentTime - lastSendTime >= sendInterval) {
      lastSendTime = currentTime;

      // Leitura RMS
      float rmsSum = 0;
      for (int i = 0; i < NUM_SAMPLES; i++) {
        size_t bytesRead = 0;
        esp_err_t result = i2s_read(I2S_PORT, &i2sBuffer, BUFFER_LEN * sizeof(int16_t), &bytesRead, portMAX_DELAY);
        if (result == ESP_OK && bytesRead > 0) {
          int samplesRead = bytesRead / sizeof(int16_t);
          float sumSquares = 0;
          for (int j = 0; j < samplesRead; j++) {
            int16_t sample = i2sBuffer[j];
            sumSquares += sample * sample;
          }
          float rms = sqrt(sumSquares / samplesRead);
          rmsSum += rms;
        }
      }

      float rmsAverage = rmsSum / NUM_SAMPLES;
      Serial.print("Nível de ruído RMS: ");
      Serial.println(rmsAverage);

      // Enviar ao Firebase
      Database.set<float>(aClient, "/microfone/rms", rmsAverage, processaResultados, "Envio_RMS");

      // Verificação de conforto acústico
      String alerta;
      if (rmsAverage > 1000) {
        alerta = "Ruído alto";
      } else {
        alerta = "Ruído normal";
      }

      Database.set<String>(aClient, "/microfone/alerta", alerta, processaResultados, "Envio_Alerta");
    }
  }
}
