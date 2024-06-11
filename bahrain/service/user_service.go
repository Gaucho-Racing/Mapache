package service

import (
	"bahrain/database"
	"bahrain/utils"
	"time"

	"github.com/gaucho-racing/mapache-go"
)

func GetAllUsers() []mapache.User {
	var users []mapache.User
	database.DB.Find(&users)
	for i := range users {
		users[i].Password = ""
		users[i].Roles = GetRolesForUser(users[i].ID)
	}
	return users
}

func GetUserByID(id string) mapache.User {
	var user mapache.User
	database.DB.Where("id = ?", id).First(&user)
	user.Password = ""
	user.Roles = GetRolesForUser(user.ID)
	return user
}

func CreateUser(user mapache.User) error {
	result := database.DB.Where("id = ?", user.ID).Updates(&user)
	if result.Error != nil {
		return result.Error
	}
	SetRolesForUser(user.ID, user.Roles)
	return nil
}

func GetRolesForUser(userID string) []string {
	var roles []mapache.UserRole
	var roleNames = make([]string, 0)
	result := database.DB.Where("user_id = ?", userID).Find(&roles)
	if result.Error != nil {
		return roleNames
	}
	for _, r := range roles {
		roleNames = append(roleNames, r.Role)
	}
	return roleNames
}

func SetRolesForUser(userID string, roles []string) []string {
	existingRoles := GetRolesForUser(userID)
	for _, nr := range roles {
		if !contains(existingRoles, nr) {
			result := database.DB.Create(&mapache.UserRole{
				UserID:    userID,
				Role:      nr,
				CreatedAt: time.Time{},
			})
			if result.Error != nil {
				utils.SugarLogger.Errorln(result.Error.Error())
			}
		}
	}
	for _, er := range existingRoles {
		if !contains(roles, er) {
			database.DB.Where("user_id = ? AND role = ?", userID, er).Delete(&mapache.UserRole{})
		}
	}
	return GetRolesForUser(userID)
}

func contains(s []string, e string) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}
