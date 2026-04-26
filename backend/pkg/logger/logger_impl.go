package logger

import (
	"sync"
	"taskflow/pkg/config"

	"github.com/sirupsen/logrus"
)

var (
	instance ILogger
	once     sync.Once
)

type logrusLogger struct {
	logger *logrus.Logger
}

func NewLogger(cfg *config.Config) ILogger {
	once.Do(func() {
		log := logrus.New()
		log.SetFormatter(&logrus.JSONFormatter{
			DisableHTMLEscape: true,
		})

		level, err := logrus.ParseLevel(cfg.LogLevel)
		if err != nil {
			level = logrus.InfoLevel
		}
		log.SetLevel(level)

		instance = &logrusLogger{logger: log}
	})
	return instance
}

func GetLogger() ILogger {
	if instance == nil {
		log := logrus.New()
		log.SetFormatter(&logrus.JSONFormatter{DisableHTMLEscape: true})
		log.SetLevel(logrus.InfoLevel)
		return &logrusLogger{logger: log}
	}
	return instance
}

func (l *logrusLogger) Infof(format string, args ...interface{})  { l.logger.Infof(format, args...) }
func (l *logrusLogger) Debugf(format string, args ...interface{}) { l.logger.Debugf(format, args...) }
func (l *logrusLogger) Warnf(format string, args ...interface{})  { l.logger.Warnf(format, args...) }
func (l *logrusLogger) Errorf(format string, args ...interface{}) { l.logger.Errorf(format, args...) }
func (l *logrusLogger) Fatalf(format string, args ...interface{}) { l.logger.Fatalf(format, args...) }
