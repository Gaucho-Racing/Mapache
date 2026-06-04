package worker

import (
	"context"
	"fmt"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
)

// StartPool spawns config.NumWorkers goroutines, each running its own
// claim loop against the supplied registry. Worker IDs are hostname-N
// so foreman can tell siblings apart on the same host but ID stays
// stable across restarts.
//
// No-op when FOREMAN_ENDPOINT is unset (the on-vehicle gr26 deployment
// stays out of foreman entirely) or when the registry has no kinds.
func StartPool(ctx context.Context, reg *Registry) {
	if config.ForemanEndpoint == "" {
		logger.SugarLogger.Infoln("[WORKER] pool disabled (FOREMAN_ENDPOINT unset)")
		return
	}
	if len(reg.Kinds()) == 0 {
		logger.SugarLogger.Infoln("[WORKER] pool disabled (no handlers registered)")
		return
	}

	n := config.NumWorkers
	if n < 1 {
		n = 1
	}
	host := hostname()
	logger.SugarLogger.Infof("[WORKER] starting pool of %d workers (kinds=%v)", n, reg.Kinds())
	for i := 0; i < n; i++ {
		w := &Worker{
			ID:       fmt.Sprintf("gr26-%s-%d", host, i),
			Registry: reg,
		}
		go w.Run(ctx)
	}
}
