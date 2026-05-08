# 🧠 Inventory Management System
The Inventory Management System is a comprehensive web application designed to manage inventory, orders, and pricing settings for businesses. It provides a user-friendly interface for managing inventory items, tracking orders, and updating pricing settings. The application utilizes a range of technologies, including React, Vite, and Firebase, to provide a scalable and efficient solution for inventory management.

## 🚀 Features
* Inventory management: add, update, and delete inventory items
* Order management: add, update, and delete orders
* Pricing settings management: update pricing settings
* Real-time inventory tracking: listen to inventory changes and update the application accordingly
* Authentication and authorization: manage user authentication and authorization using Firebase Authentication
* Responsive design: the application is optimized for use on a range of devices, including desktops, laptops, and mobile devices

## 🛠️ Tech Stack
* Frontend: React, Vite
* Backend: Firebase, Firestore
* Database: Firestore
* Authentication: Firebase Authentication
* State management: Zustand
* Payment gateway: Stripe
* APIs: orders API, inventory API, pricing API
* Utilities: clsx, tailwind-merge

## 📦 Installation
To install the application, follow these steps:
1. Clone the repository using `git clone`
2. Install the dependencies using `npm install` or `yarn install`
3. Set up the Firebase project and configure the environment variables
4. Start the development server using `npm run dev` or `yarn dev`

## 💻 Usage
To use the application, follow these steps:
1. Start the development server using `npm run dev` or `yarn dev`
2. Open the application in a web browser using `http://localhost:8080`
3. Log in to the application using a valid username and password
4. Manage inventory items, orders, and pricing settings using the application's interface

## 📂 Project Structure
```markdown
.
├── index.html
├── vite.config.ts
├── src
│   ├── App.tsx
│   ├── main.tsx
│   ├── contexts
│   │   ├── AuthContext.tsx
│   ├── hooks
│   │   ├── useManageSubscription.ts
│   │   ├── useSubscription.ts
│   ├── lib
│   │   ├── stripe.ts
│   │   ├── ordersApi.ts
│   │   ├── firebase.ts
│   │   ├── utils.ts
│   │   ├── inventoryApi.ts
│   ├── store
│   │   ├── inventoryStore.ts
│   │   ├── pricingStore.ts
│   │   ├── orderStore.ts
├── types
│   ├── inventory.ts
│   ├── order.ts
```

## 📸 Screenshots

## 🤝 Contributing
To contribute to the application, please follow these steps:
1. Fork the repository using `git fork`
2. Create a new branch using `git branch`
3. Make changes to the code and commit them using `git commit`
4. Push the changes to the remote repository using `git push`
5. Create a pull request using the GitHub interface