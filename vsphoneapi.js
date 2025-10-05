const crypto = require('crypto-js');
const moment = require('moment');
const axios = require('axios');

class VSPhoneAPIService {
    constructor() {
        this.accessKeyId = process.env.VSPHONE_ACCESS_KEY || 'X23YyMQsPbcGBpSfeYPXA7T6BqbFKRKh';
        this.secretAccessKey = process.env.VSPHONE_SECRET_KEY || 'xUoyXWmfh0tdDSj17buZVpm6';
        this.baseURL = 'https://api.vsphone.com';
        this.host = 'api.vsphone.com';
        this.service = 'armcloud-paas';
    }

    // HMAC-SHA256 Signature Generator
    generateSignature(method, path, body = null) {
        const xDate = moment().utc().format('YYYYMMDDTHHmmss[Z]');
        const shortXDate = xDate.substring(0, 8);
        
        let paramsString = '';
        if (method === 'POST' && body) {
            paramsString = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const xContentSha256 = crypto.SHA256(paramsString).toString(crypto.enc.Hex);
        
        const canonicalString = [
            `host:${this.host}`,
            `x-date:${xDate}`,
            `content-type:application/json;charset=UTF-8`,
            `signedHeaders:content-type;host;x-content-sha256;x-date`,
            `x-content-sha256:${xContentSha256}`
        ].join('\n');

        const credentialScope = `${shortXDate}/${this.service}/request`;
        const stringToSign = [
            'HMAC-SHA256',
            xDate,
            credentialScope,
            crypto.SHA256(canonicalString).toString(crypto.enc.Hex)
        ].join('\n');

        const kDate = crypto.HmacSHA256(shortXDate, this.secretAccessKey);
        const kService = crypto.HmacSHA256(this.service, kDate);
        const signKey = crypto.HmacSHA256('request', kService);
        const signature = crypto.HmacSHA256(stringToSign, signKey).toString(crypto.enc.Hex);

        const authorization = [
            `HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}`,
            'SignedHeaders=content-type;host;x-content-sha256;x-date',
            `Signature=${signature}`
        ].join(', ');

        return {
            'x-date': xDate,
            'x-host': this.host,
            'authorization': authorization,
            'content-type': 'application/json;charset=UTF-8'
        };
    }

    // API Request Method
    async makeRequest(method, endpoint, data = null) {
        const headers = this.generateSignature(method, endpoint, data);
        
        const config = {
            method: method,
            url: `${this.baseURL}${endpoint}`,
            headers: headers,
            timeout: 30000
        };

        if (method === 'POST' && data) {
            config.data = data;
        }

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error('API Request Failed:', error.response?.data || error.message);
            throw new Error(error.response?.data?.msg || 'API request failed');
        }
    }

    // Instance Management Methods
    async getInstances() {
        return await this.makeRequest('POST', '/vsphone/api/padApi/infos', {
            page: 1,
            rows: 50
        });
    }

    async createInstance(androidVersion = 'Android13', goodId = 1) {
        return await this.makeRequest('POST', '/vsphone/api/padApi/createMoneyOrder', {
            androidVersionName: androidVersion,
            goodId: goodId,
            goodNum: 1,
            autoRenew: true
        });
    }

    async restartInstance(padCodes) {
        return await this.makeRequest('POST', '/vsphone/api/padApi/restart', {
            padCodes: Array.isArray(padCodes) ? padCodes : [padCodes],
            changeIpFlag: false
        });
    }

    async executeCommand(padCode, command) {
        return await this.makeRequest('POST', '/vsphone/api/padApi/asyncCmd', {
            padCodes: [padCode],
            scriptContent: command
        });
    }

    async uploadFile(padCode, fileUrl, autoInstall = 0) {
        return await this.makeRequest('POST', '/vsphone/api/padApi/uploadFileV3', {
            padCodes: [padCode],
            url: fileUrl,
            autoInstall: autoInstall
        });
    }

    async getInstanceScreenshot(padCode) {
        return await this.makeRequest('POST', '/vsphone/api/padApi/generatePreview', {
            padCodes: [padCode],
            rotation: 0,
            broadcast: false
        });
    }

    async oneClickNewDevice(padCode, countryCode = 'US') {
        return await this.makeRequest('POST', '/vsphone/api/padApi/replacePad', {
            padCodes: [padCode],
            countryCode: countryCode
        });
    }
}

module.exports = VSPhoneAPIService;