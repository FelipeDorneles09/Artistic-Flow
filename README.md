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
<img width="1365" height="767" alt="Captura de tela 2026-05-08 105330" src="https://github.com/user-attachments/assets/12275d72-49b8-4e85-8c91-e9adf79fbcfa" />
<img width="1365" height="767" alt="Captura de tela 2026-05-08 105314" src="https://github.com/user-attachments/assets/bb3ca473-7eb8-4c7f-bcf8-ab71faee4179" />
<img width="1365" height="767" alt="Captura de tela 2026-05-08 105305" src="https://github.com/user-attachments/assets/8d8b9670-3af2-467b-ac72-834f54f29389" />
<img width="1365" height="767" alt="Captura de tela 2026-05-08 105259" src="https://github.com/user-attachments/assets/60869be1-9130-4cd4-87ee-85cf7ac6f6ad" />
<img width="1365" height="767" alt="Captura de tela 2026-05-08 105252" src="https://github.com/user-attachments/assets/51abaa7a-043d-4459-b378-72f9096df046" />
<img width="1365" height="767" alt="Captura de tela 2026-05-08 105337" src="https://github.com/user-attachments/assets/e58f06c8-c3e2-4f41-aabd-fecfa3e8f1b0" />


## 🤝 Contributing
To contribute to the application, please follow these steps:
1. Fork the repository using `git fork`
2. Create a new branch using `git branch`
3. Make changes to the code and commit them using `git commit`
4. Push the changes to the remote repository using `git push`
5. Create a pull request using the GitHub interface
