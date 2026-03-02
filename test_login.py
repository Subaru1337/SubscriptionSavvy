from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common keys import Keys

import time

def test_login():

driver = webdriver. Chrome()

driver.maximize window()

# Example login site
driver.get("https://practicetestautomation.com/practice-test-login/")

# Locate elements
username = driver.find_element(By.ID, "username")
password = driver.find_element(By.ID, "password")

submit = driver.find_element(By.ID, "submit")
# Perform login

username.send_keys("student")

password.send_keys("Password123")

submit.click()

time.sleep(3)

# Assertion (VERY IMPORTANT in testing)

assert "Logged In Successfully" in driver page source

driver.quit()
