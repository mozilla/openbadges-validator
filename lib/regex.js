module.exports = {
  url: /(^(https?):\/\/[^\s\/$.?#].[^\s]*$)|(^\/\S+$)/,
  absoluteUrl: /^https?:\/\/[^\s\/$.?#].[^\s]*$/,
  email: /[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+(?:\.[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?/i,
  hash: /^([A-Za-z0-9]+)\$([A-Za-z0-9]+)$/,
  origin: /^(https?):\/\/[^\s\/$.?#].[^\s\/]*\/?$/,
  version: /^v?\d+\.\d+(\.\d+)?$/,
  date: /(^\d{4}-\d{2}-\d{2}$)|(^\d{1,10}$)/,
  identityType: /^(email)$/i,
  verificationType: /^(hosted)|(signed)$/i,
  unixtime: /^1\d{9}$/,
}
