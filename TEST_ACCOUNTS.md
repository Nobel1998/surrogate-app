# Test Accounts for Login

## 🔐 Pre-configured Test Accounts

The app now includes proper password validation. Here are the test accounts you can use:

### **Demo Account 1**
- **Email**: `demo@example.com`
- **Password**: `password123`
- **Name**: Demo User
- **Phone**: +1-555-0123
- **Address**: 123 Main St, City, State 12345

### **Demo Account 2**
- **Email**: `test@surrogacy.com`
- **Password**: `surrogacy2024`
- **Name**: Test Surrogate
- **Phone**: +1-555-0125
- **Address**: 456 Oak Ave, City, State 12345

## 🧪 Testing Login Security

### **Valid Login Tests**
1. Use `demo@example.com` with `password123` → Should login successfully
2. Use `test@surrogacy.com` with `surrogacy2024` → Should login successfully

### **Invalid Login Tests**
1. Use `demo@example.com` with `wrongpassword` → Should show "Invalid email or password"
2. Use `nonexistent@email.com` with any password → Should show "Invalid email or password"
3. Use empty email or password → Should show "Email and password cannot be empty"

### **Registration Tests**
1. Register with new email → Should create account and auto-login
2. Try to register with existing email → Should show "An account with this email already exists"
3. Register without password → Should show "Email and password are required"

## 🔧 How It Works

### **Password Validation**
- Passwords are stored in the mock database
- Login compares entered password with stored password
- Only correct email/password combinations will succeed

### **Security Features**
- Case-insensitive email matching
- Password must match exactly
- Clear error messages for invalid attempts
- No password exposure in user data

### **Mock Database**
- Simulates a real user database
- Stores user credentials securely
- Supports both login and registration
- Maintains user data between sessions

## 📱 User Experience

### **Login Flow**
1. Enter email and password
2. System validates credentials
3. If valid: Login successful, show main app
4. If invalid: Show error message, stay on login screen

### **Registration Flow**
1. Complete registration form
2. System checks if email already exists
3. If new: Create account and auto-login
4. If exists: Show error message

## 🚀 Ready for Testing

The app now has proper authentication security. Try logging in with the test accounts or register a new account to see the full functionality!

