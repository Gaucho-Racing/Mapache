package database

import (
	"ac/utils"
	"sync"
	"time"
)

type BatchInserter[T any] struct {
	mu        sync.Mutex
	buffer    []T
	maxSize   int
	ticker    *time.Ticker
	stopCh    chan struct{}
	tableName string
}

func NewBatchInserter[T any](tableName string, maxSize int, flushInterval time.Duration) *BatchInserter[T] {
	b := &BatchInserter[T]{
		buffer:    make([]T, 0, maxSize),
		maxSize:   maxSize,
		ticker:    time.NewTicker(flushInterval),
		stopCh:    make(chan struct{}),
		tableName: tableName,
	}
	go b.run()
	return b
}

func (b *BatchInserter[T]) run() {
	for {
		select {
		case <-b.ticker.C:
			b.Flush()
		case <-b.stopCh:
			return
		}
	}
}

func (b *BatchInserter[T]) Add(item T) {
	b.mu.Lock()
	b.buffer = append(b.buffer, item)
	shouldFlush := len(b.buffer) >= b.maxSize
	b.mu.Unlock()

	if shouldFlush {
		b.Flush()
	}
}

func (b *BatchInserter[T]) Flush() {
	b.mu.Lock()
	if len(b.buffer) == 0 {
		b.mu.Unlock()
		return
	}
	batch := b.buffer
	b.buffer = make([]T, 0, b.maxSize)
	b.mu.Unlock()

	if result := DB.CreateInBatches(&batch, len(batch)); result.Error != nil {
		utils.SugarLogger.Errorf("[DB] Batch insert failed for %s: %s", b.tableName, result.Error)
		return
	}
	utils.SugarLogger.Infof("[DB] Flushed %d %s rows", len(batch), b.tableName)
}

func (b *BatchInserter[T]) Stop() {
	b.ticker.Stop()
	close(b.stopCh)
	b.Flush()
}
