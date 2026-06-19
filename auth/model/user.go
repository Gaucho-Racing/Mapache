package model

import "time"

// User mirrors the profile fields Sentinel v5 exposes for a logged-in
// user. Groups is the source of truth for role-based gating in v5 —
// callers check membership with HasGroup against a Sentinel group name.
type User struct {
	ID                    string    `gorm:"primaryKey" json:"id"`
	Username              string    `json:"username"`
	FirstName             string    `json:"first_name"`
	LastName              string    `json:"last_name"`
	Email                 string    `json:"email"`
	PhoneNumber           string    `json:"phone_number"`
	Gender                string    `json:"gender"`
	Birthday              string    `json:"birthday"`
	GraduateLevel         string    `json:"graduate_level"`
	GraduationYear        int       `json:"graduation_year"`
	Major                 string    `json:"major"`
	ShirtSize             string    `json:"shirt_size"`
	JacketSize            string    `json:"jacket_size"`
	SAERegistrationNumber string    `json:"sae_registration_number"`
	AvatarURL             string    `json:"avatar_url"`
	Verified              bool      `json:"verified"`
	Groups                []string  `gorm:"-" json:"groups"`
	UpdatedAt             time.Time `gorm:"autoUpdateTime" json:"updated_at"`
	CreatedAt             time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (user User) String() string {
	return "(" + user.ID + ")" + " " + user.FirstName + " " + user.LastName + " [" + user.Email + "]"
}

// HasGroup reports whether the user is a member of the named Sentinel
// group. Names are case-sensitive and match what the Sentinel UI
// displays (e.g. "Admins", "Officers", "Leads").
func (user User) HasGroup(name string) bool {
	for _, g := range user.Groups {
		if g == name {
			return true
		}
	}
	return false
}
