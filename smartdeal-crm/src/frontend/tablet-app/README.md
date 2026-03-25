# SmartDeal Tablet App (PDI & Delivery)

React Native / Expo tablet application for PDI technicians and delivery managers. Optimised for 10-inch Android tablets used on the dealership floor.

## Tech Stack
- **Framework:** React Native + Expo SDK 50
- **Target Devices:** Android tablets (10-inch, minimum Android 11)
- **Navigation:** React Navigation (stack + tab)
- **State:** Zustand + React Query
- **Camera:** Expo Camera (photo capture for PDI evidence)
- **Signature Pad:** react-native-signature-canvas (delivery confirmation)
- **Offline Support:** AsyncStorage + background sync (checklist usable offline, syncs when connected)

## Modules

### PDI Module (for PDI Technicians)
- Login via WhatsApp OTP
- My assigned PDI jobs list
- Checklist view by section (Exterior, Interior, Mechanical, Electrical, Docs)
- Pass / Fail / Rework / NA selection per item
- Camera capture for Fail/Rework items (uploads to AWS S3)
- Notes input per item
- Submit completed PDI checklist
- View PDI history

### Delivery Module (for Delivery Managers)
- Delivery schedule for today and upcoming
- Vehicle handover checklist (digital tick boxes)
- Customer signature capture (touch-based)
- Sales consultant signature capture
- Photo capture at delivery (key handover, family photo)
- Mark delivery complete

## Offline Capability
Checklist responses cached locally. Syncs to server when Wi-Fi reconnects.
This ensures PDI work in the yard (possible poor Wi-Fi) is not interrupted.

## Build
```bash
cd src/frontend/tablet-app
npm install
npx expo start          # Dev server
npx expo build:android  # Production APK
```
