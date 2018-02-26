'use strict';

const { join } = require('path');
const { URL } = require('url');
const { createHash } = require('crypto');
const request = require('request-promise-native');

module.exports = class Newsletter {
  constructor (config) {
    this._defaults = {
      apiVersion: '3.0',
      secure: true
    };
    this._config = Object.assign(this._defaults, config);
    this._base = 'api.mailchimp.com';
  }

  async check (email) {
    let hash = this._hashEmail(email);
    try {
      await this._request({
        path: join('lists', this._config.listId, 'members', hash)
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async subscribe ({ email, name }) {
    try {
      const isSubscribed = await this.check(email);
      if (isSubscribed) return { status: 'already-subscribed' };
      const body = {
        'email_address': email,
        'status': 'subscribed',
        'merge_fields': {
          'NAME': name
        }
      };
      await this._request({
        path: join('lists', this._config.listId, 'members'),
        method: 'post',
        body
      });
      return { status: 'success' };
    } catch (error) {
      throw Object.assign(new Error(), { status: 'error' });
    }
  }

  async _request ({ method = 'get', path, body }) {
    const config = this._config;
    let url = new URL(
      join(config.apiVersion, path),
      'http' + (config.secure ? 's' : '') + '://' + [ config.areaCode, this._base ].join('.')
    );
    const headers = {
      'Authorization': `apikey ${ config.apiKey }`
    };
    let options = {
      uri: url.href,
      method: method.toUpperCase(),
      headers,
      json: true,
      resolveWithFullResponse: true
    };
    if (body) options.body = body;
    try {
      const { statusCode, response } = await request(options);
      return { status: statusCode, body: response ? response.body || undefined : undefined };
    } catch (error) {
      throw Object.assign(new Error(), {
        status: error.statusCode,
        body: error.response ? error.response.body || undefined : undefined
      });
    }
  }

  _hashEmail (email) {
    return createHash('md5').update(email.toLowerCase()).digest('hex');
  }

  // TODO
  // Include unsubscribe and update
};
