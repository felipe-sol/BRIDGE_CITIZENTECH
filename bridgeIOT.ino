
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPSPlus.h>
#include <math.h>

// Configuracoes
const char* WIFI_SSID        = "SEU_WIFI";
const char* WIFI_PASS        = "SUA_SENHA";
const char* API_URL          = "http://IP_DO_PC:8000/ocorrencias";
const char* IDENTIFICACAO_ID = "COLE_O_UUID_AQUI";
const char* DEVICE_ID        = "esp32-001";

const unsigned long INTERVALO_MS  = 5;
const float ALPHA                 = 0.003;
const float LIMIAR_INICIO         = 2.5;
const float LIMIAR_FIM            = 1.2;
const unsigned long MAX_EVENTO_MS = 500;
const float MIN_VELOCIDADE_KMH    = 0;

Adafruit_MPU6050 mpu;
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

struct Evento {
  float pico;
  uint16_t duracao;
  const char* nivel;
  double lat;
  double lng;
  float velocidade;
};

QueueHandle_t filaEventos;

float bx = 0, by = 0, bz = 0;

unsigned long ultimaLeitura = 0;
unsigned long inicioEvento = 0;
bool emEvento = false;
float picoEvento = 0;

// Gera uma chave UUID para identificar cada envio
void gerarUUID(char* out) {
  uint8_t b[16];

  for (int i = 0; i < 16; i += 4) {
    uint32_t r = esp_random();
    memcpy(&b[i], &r, 4);
  }

  b[6] = (b[6] & 0x0F) | 0x40;
  b[8] = (b[8] & 0x3F) | 0x80;

  snprintf(out, 37,
    "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
    b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7],
    b[8], b[9], b[10], b[11], b[12], b[13], b[14], b[15]);
}

void taskEnvio(void* param) {
  Evento e;

  for (;;) {
    if (xQueueReceive(filaEventos, &e, portMAX_DELAY) != pdTRUE) continue;

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Sem Wi-Fi, evento descartado");
      WiFi.reconnect();
      continue;
    }

    bool risco = (strcmp(e.nivel, "MEDIO") != 0);

    char titulo[80];
    snprintf(titulo, sizeof(titulo),
             "Irregularidade na pista (impacto %s)", e.nivel);

    char body[700];
    snprintf(body, sizeof(body),
      "{\"identificacao_id\":\"%s\","
      "\"titulo\":\"%s\","
      "\"descricao\":\"Impacto %s detectado por sensor veicular. "
      "Pico: %.2f m/s2, duracao: %u ms, velocidade: %.1f km/h. "
      "Registro automatico do dispositivo %s.\","
      "\"categoria\":\"BURACO\","
      "\"latitude\":%.6f,\"longitude\":%.6f,"
      "\"risco_imediato\":%s,"
      "\"bloqueia_passagem\":false,"
      "\"afeta_acessibilidade\":false}",
      IDENTIFICACAO_ID, titulo, e.nivel, e.pico, e.duracao,
      e.velocidade, DEVICE_ID, e.lat, e.lng,
      risco ? "true" : "false");

    char chave[37];
    gerarUUID(chave);

    for (int tentativa = 1; tentativa <= 3; tentativa++) {
      HTTPClient http;
      http.begin(API_URL);
      http.setTimeout(5000);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("Idempotency-Key", chave);

      int code = http.POST(body);
      Serial.printf("POST tentativa %d -> %d\n", tentativa, code);

      if (code == 200 || code == 201) {
        http.end();
        break;
      }

      if (code >= 400 && code < 500) {
        Serial.println(http.getString());
        http.end();
        break;
      }

      http.end();
      vTaskDelay(pdMS_TO_TICKS(2000));
    }
  }
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  Wire.setClock(400000);

  if (!mpu.begin()) {
    Serial.println("MPU6050 nao encontrado!");
    while (1) delay(10);
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setFilterBandwidth(MPU6050_BAND_44_HZ);

  Serial.println("Calibrando...");

  const int N = 200;
  float sx = 0, sy = 0, sz = 0;

  for (int i = 0; i < N; i++) {
    sensors_event_t a, g, t;
    mpu.getEvent(&a, &g, &t);

    sx += a.acceleration.x;
    sy += a.acceleration.y;
    sz += a.acceleration.z;

    delay(5);
  }

  bx = sx / N;
  by = sy / N;
  bz = sz / N;

  // GPS NEO-6M
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  filaEventos = xQueueCreate(10, sizeof(Evento));
  xTaskCreatePinnedToCore(taskEnvio, "envio", 8192, NULL, 1, NULL, 0);

  Serial.println("Bridge IoT iniciado!");
}

void loop() {
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  unsigned long agora = millis();

  if (agora - ultimaLeitura < INTERVALO_MS) return;
  ultimaLeitura = agora;

  sensors_event_t a, g, t;
  mpu.getEvent(&a, &g, &t);

  float x = a.acceleration.x;
  float y = a.acceleration.y;
  float z = a.acceleration.z;

  float dx = x - bx;
  float dy = y - by;
  float dz = z - bz;

  float desvio = sqrt(dx * dx + dy * dy + dz * dz);

  if (!emEvento) {
    if (desvio > LIMIAR_INICIO) {
      emEvento = true;
      inicioEvento = agora;
      picoEvento = desvio;
    } else {
      bx += ALPHA * dx;
      by += ALPHA * dy;
      bz += ALPHA * dz;
    }

    return;
  }

  if (desvio > picoEvento) picoEvento = desvio;

  unsigned long duracao = agora - inicioEvento;

  if (desvio < LIMIAR_FIM) {
    const char* nivel;

    if (picoEvento < 5) nivel = "MEDIO";
    else if (picoEvento < 10) nivel = "ALTO";
    else nivel = "SEVERO";

    Serial.printf("Obstaculo | Pico: %.2f m/s2 | Duracao: %lu ms | Nivel: %s\n",
                  picoEvento, duracao, nivel);

    bool gpsOk = gps.location.isValid() && gps.location.age() < 3000;
    float vel = gps.speed.isValid() ? (float)gps.speed.kmph() : 0;

    if (!gpsOk) {
      Serial.println("");
    } else if (vel < MIN_VELOCIDADE_KMH) {
      Serial.println("Veiculo parado, evento ignorado");
    } else {
      Evento ev = {
        picoEvento,
        (uint16_t)duracao,
        nivel,
        gps.location.lat(),
        gps.location.lng(),
        vel
      };

      xQueueSend(filaEventos, &ev, 0);
    }

    emEvento = false;

  } else if (duracao > MAX_EVENTO_MS) {
    Serial.println("Mudanca de estado, base reajustada");

    bx = x;
    by = y;
    bz = z;

    emEvento = false;
  }
}
