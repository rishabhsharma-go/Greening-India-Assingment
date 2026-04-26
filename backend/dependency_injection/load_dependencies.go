package dependencyInjection

import (
	"context"
	"net/http"
	"taskflow/pkg/config"
	"taskflow/routers"

	"github.com/gin-gonic/gin"
	"go.uber.org/fx"
)

func LoadDependencies() {
	app := fx.New(
		configModule,
		loggerModule,
		databaseModule,
		authModule,
		projectModule,
		taskModule,
		fx.Provide(routers.NewRouter),
		fx.Invoke(startHTTPServer),
	)

	app.Run()
}

func startHTTPServer(lc fx.Lifecycle, engine *gin.Engine, cfg *config.Config) {
	srv := &http.Server{
		Addr:    cfg.ServerPort,
		Handler: engine,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			go func() {
				if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
					// server stopped unexpectedly
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			return srv.Shutdown(ctx)
		},
	})
}
