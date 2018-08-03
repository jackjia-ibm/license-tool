const winston = require('winston');

const createLogger = (level, file) => {
  let transports = [];

  transports.push(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.splat(),
      winston.format.printf(info => {
        const lvl = info.level.indexOf('info') > -1 ? '' : `[${info.level}]: `;
        return `${lvl}${info.message}`;
      })
    ),
  }));

  if (file) {
    transports.push(new winston.transports.File({
      filename: `logs/${file}`,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.splat(),
        winston.format.printf(info => {
          return `${info.timestamp} ${info.level}: ${info.message}`;
        })
      ),
    }));
  }

  return winston.createLogger({
    level,
    transports,
  });
};

module.exports = createLogger;
