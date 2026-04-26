package database

import (
	"taskflow/migrations"
	"taskflow/pkg/config"
	"taskflow/pkg/logger"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

func NewDatabase(cfg *config.Config, log logger.ILogger) (*gorm.DB, error) {
	if err := runMigrations(cfg, log); err != nil {
		return nil, err
	}

	db, err := gorm.Open(postgres.Open(config.GetDSN(cfg)), &gorm.Config{
		Logger: gormLogger.Default.LogMode(gormLogger.Silent),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)

	log.Infof("database connected successfully")
	return db, nil
}

func runMigrations(cfg *config.Config, log logger.ILogger) error {
	d, err := iofs.New(migrations.Files, ".")
	if err != nil {
		return err
	}

	m, err := migrate.NewWithSourceInstance("iofs", d, config.GetMigrateDSN(cfg))
	if err != nil {
		return err
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return err
	}

	log.Infof("migrations applied successfully")
	return nil
}
