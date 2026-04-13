// Package migrations embeds all SQL migration files into the binary so that
// no external files are needed at runtime.  golang-migrate reads them via the
// iofs source driver.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
