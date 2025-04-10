const { Storage } = require('@google-cloud/storage');

class FirebaseStorageService {
  constructor() {
    this.storage = new Storage({
      projectId: process.env.FIREBASE_PROJECT_ID,
      keyFilename: process.env.FIREBASE_KEY_PATH,
    });
    this.bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  }

  /**
   * Salva um arquivo JSON no Firebase Storage
   * @param {Object} data - Dados a serem salvos
   * @param {string} path - Caminho do arquivo
   * @returns {Promise<string>} - URL do arquivo
   */
  async saveJsonToStorage(data, path) {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(path);

      // Converte dados para JSON e salva
      await file.save(JSON.stringify(data, null, 2), {
        contentType: 'application/json',
        metadata: {
          cacheControl: 'public, max-age=3600'
        }
      });

      // Torna o arquivo publicamente acessível
      await file.makePublic();

      // Retorna a URL pública
      return `https://storage.googleapis.com/${this.bucketName}/${path}`;
    } catch (error) {
      console.error('Erro ao salvar JSON no Storage:', error);
      throw new Error('Falha ao salvar dados no Storage');
    }
  }

  /**
   * Salva um gráfico ou imagem no Firebase Storage
   * @param {Buffer} imageBuffer - Buffer da imagem
   * @param {string} path - Caminho do arquivo
   * @param {string} contentType - Tipo de conteúdo (ex: 'image/png')
   * @returns {Promise<string>} - URL da imagem
   */
  async saveChartImage(imageBuffer, path, contentType = 'image/png') {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(path);

      // Salva o buffer da imagem
      await file.save(imageBuffer, {
        contentType,
        metadata: {
          cacheControl: 'public, max-age=3600'
        }
      });

      // Torna o arquivo publicamente acessível
      await file.makePublic();

      // Retorna a URL pública
      return `https://storage.googleapis.com/${this.bucketName}/${path}`;
    } catch (error) {
      console.error('Erro ao salvar imagem no Storage:', error);
      throw new Error('Falha ao salvar imagem no Storage');
    }
  }

  /**
   * Recupera um arquivo JSON do Firebase Storage
   * @param {string} path - Caminho do arquivo
   * @returns {Promise<Object>} - Dados do arquivo JSON
   */
  async getJsonFromStorage(path) {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(path);

      // Verifica se o arquivo existe
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error(`Arquivo não encontrado: ${path}`);
      }

      // Baixa o conteúdo do arquivo
      const [content] = await file.download();

      // Faz o parse do conteúdo como JSON
      return JSON.parse(content.toString());
    } catch (error) {
      console.error('Erro ao recuperar JSON do Storage:', error);
      throw new Error('Falha ao recuperar dados do Storage');
    }
  }

  /**
   * Remove um arquivo do Firebase Storage
   * @param {string} path - Caminho do arquivo
   * @returns {Promise<boolean>} - Sucesso da operação
   */
  async deleteFile(path) {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(path);

      // Verifica se o arquivo existe
      const [exists] = await file.exists();
      if (!exists) {
        console.warn(`Arquivo não encontrado para exclusão: ${path}`);
        return false;
      }

      // Deleta o arquivo
      await file.delete();
      console.log(`Arquivo removido com sucesso: ${path}`);
      return true;
    } catch (error) {
      console.error('Erro ao remover arquivo do Storage:', error);
      throw new Error('Falha ao remover arquivo do Storage');
    }
  }
}

module.exports = FirebaseStorageService;