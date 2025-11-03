/**
 * i18n Configuration
 * Multi-language support for Indonesian and English
 */

const i18n = require('i18n');
const path = require('path');

i18n.configure({
  // Supported locales
  locales: ['id', 'en'],

  // Default locale (Indonesian)
  defaultLocale: 'id',

  // Directory where translation files are stored
  directory: path.join(__dirname, '../locales'),

  // Cookie name to store language preference
  cookie: 'language',

  // Query parameter to change language (?lang=en)
  queryParameter: 'lang',

  // Don't update translation files automatically
  updateFiles: false,

  // Don't sync translation files
  syncFiles: false,

  // Indentation for JSON files
  indent: '  ',

  // Extension for translation files
  extension: '.json',

  // Prefix for translation keys
  prefix: '',

  // Register helper methods
  register: global,

  // Fallback to default locale if translation not found
  fallbacks: {
    'en': 'id'
  },

  // Object notation for nested translations
  objectNotation: true,

  // Log debug messages
  logDebugFn: function (msg) {
    // Uncomment for debugging
    // console.log('i18n debug:', msg);
  },

  // Log warn messages
  logWarnFn: function (msg) {
    console.warn('i18n warn:', msg);
  },

  // Log error messages
  logErrorFn: function (msg) {
    console.error('i18n error:', msg);
  }
});

module.exports = i18n;
