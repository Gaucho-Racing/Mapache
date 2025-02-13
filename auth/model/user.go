package model

import "time"

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
	Subteams              []Subteam `gorm:"-" json:"subteams"`
	Roles                 []string  `gorm:"-" json:"roles"`
	UpdatedAt             time.Time `gorm:"autoUpdateTime" json:"updated_at"`
	CreatedAt             time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (user User) String() string {
	return "(" + user.ID + ")" + " " + user.FirstName + " " + user.LastName + " [" + user.Email + "]"
}

func (user User) HasRole(role string) bool {
	for _, r := range user.Roles {
		if r == role {
			return true
		}
	}
	return false
}

func (user User) HasSubteam(subteam string) bool {
	for _, s := range user.Subteams {
		if s.Name == subteam {
			return true
		}
	}
	return false
}

func (user User) IsAdmin() bool {
	return user.HasRole("d_admin")
}

func (user User) IsOfficer() bool {
	return user.HasRole("d_officer")
}

func (user User) IsLead() bool {
	return user.HasRole("d_lead")
}

func (user User) IsInnerCircle() bool {
	return user.IsAdmin() || user.IsOfficer() || user.IsLead()
}

type Subteam struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}
