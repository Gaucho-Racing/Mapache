// gr26-specific glue around the drop-in Foreman client. The other two
// files in this package (foreman.go, worker.go) are byte-identical
// copies of github.com/gaucho-racing/Foreman/clients/go and depend on
// nothing outside the standard library — they're meant to track
// upstream and be diff-able straight against that source.
//
// This file is where gr26 wires the client into the rest of the
// service. Right now that's just:
//
//   - A package-level Default *Client built from
//     config.ForemanEndpoint. Producer call sites (the shelter-batch
//     hook in particular) reach for this rather than threading a
//     Client through MQTT message handlers.
//   - Init() to populate Default at startup.
//
// Default goes no-op when FOREMAN_ENDPOINT is unset — the on-vehicle
// gr26 deployment stays out of Foreman entirely; we don't want every
// caller to branch on "is it enabled here."

package foreman

import "github.com/gaucho-racing/mapache/gr26/config"

// Default is the package-level Client, populated by Init() at startup.
// Always go through Default for producer-side calls (Enqueue, Cancel,
// GetJob, etc.); workers carry their own Client reference set by main.
var Default *Client

func Init() {
	Default = New(config.ForemanEndpoint)
}
