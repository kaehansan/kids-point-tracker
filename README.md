# 🎮 Kids Points Tracker

A mobile-first point tracking system for kids with screen time rewards. Parents can easily add/remove points for chores, good behavior, and activities. Points convert to screen time minutes (1 point = 1 minute).

## ✨ Features

- **📱 Mobile-First Design** - Optimized for phones and tablets with large touch targets
- **👶 Two Kids Support** - Track points for two children with customizable names, initials, and colors
- **🏷️ Customizable Tags** - Pre-loaded with common activities (TV, Snacks, Chores, Finish Food, Clean Up)
- **➕ Quick Actions** - Fast point addition/removal with preset buttons (5, 10, 15, 30 minutes)
- **📊 Activity Log** - Track all point changes with timestamps
- **🎨 Kid-Friendly UI** - Colorful, animated interface that's fun for kids to see
- **🔐 Simple Auth** - Hardcoded password protection for parent controls
- **💾 Local Storage** - SQLite database - all data stays on your device
- **$0 Cost** - Can be deployed for free on Render.com or Railway

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed on your computer
- Basic command line knowledge

### Local Installation

1. **Extract/Clone the files** to a folder on your computer

2. **Install dependencies**:
   ```bash
   cd kids-points-tracker
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   - Navigate to `http://localhost:3000`
   - Default password: `parent123`

5. **Customize**:
   - Change the password in `server.js` (line 9)
   - Update kid names, initials, and colors in the Settings (⚙️ button)

## 🌐 Deployment Options

### Option 1: Render.com (Recommended - FREE)

1. **Create account** at [render.com](https://render.com)

2. **New Web Service**:
   - Connect your GitHub repository (or upload files)
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free

3. **Environment Variables**:
   - Add `ADMIN_PASSWORD` with your custom password

4. **Deploy** - Render will provide a URL like `https://your-app.onrender.com`

**Note**: Free tier sleeps after inactivity. First request may take 30 seconds to wake up.

### Option 2: Railway.app (FREE)

1. **Create account** at [railway.app](https://railway.app)

2. **New Project** → **Deploy from GitHub**

3. **Configure**:
   - Railway auto-detects Node.js
   - Add environment variable: `ADMIN_PASSWORD`

4. **Deploy** - Railway provides a URL

### Option 3: Vercel (FREE, but requires static build)

For Vercel, you'll need to modify the app slightly as it's designed for serverless. Render or Railway are better choices for this app.

### Option 4: Local Network Only

Run on your home computer and access from phones on same WiFi:

```bash
npm start
```

Find your computer's local IP (e.g., `192.168.1.100`) and access from phones: `http://192.168.1.100:3000`

## 📖 Usage Guide

### First Time Setup

1. **Login** with the password (default: `parent123`)

2. **Configure Kids**:
   - Click ⚙️ Settings button
   - Update names (e.g., "Alex", "Sam")
   - Set initials (e.g., "AX", "SM")
   - Choose colors for each kid

3. **Add Custom Tags** (optional):
   - Click "+ New Tag"
   - Enter name (e.g., "Homework", "Help Sibling")
   - Choose if it earns or spends points
   - Select a color

### Daily Use

1. **Select a kid** - Tap their card at the top

2. **Choose activity** - Tap a tag (TV, Chores, etc.)

3. **Set points** - Use number input or quick buttons (5, 10, 15, 30)

4. **Add or Remove**:
   - **➕ Add Points** - For good behavior, chores completed
   - **➖ Remove Points** - For screen time used, treats given

### Understanding Points

- **1 Point = 1 Minute** of screen time
- Points accumulate throughout the week
- Use points on weekends for screen time
- Activity log shows all transactions

### Tag System

**Pre-loaded Tags**:
- 🏷️ **Chores** (Green) - Earns points
- 🏷️ **Finish Food** (Blue) - Earns points  
- 🏷️ **Clean Up** (Teal) - Earns points
- 🏷️ **TV** (Purple) - Spends points
- 🏷️ **Snacks** (Orange) - Spends points

**Create Custom Tags**:
- Homework
- Help Sibling
- Reading
- Brush Teeth
- Screen Time
- Special Treat

## 🔧 Customization

### Change Password

Edit `server.js` line 9:
```javascript
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your-new-password';
```

Or set environment variable `ADMIN_PASSWORD` in your deployment platform.

### Modify Default Tags

Edit `server.js` lines 52-58 to add/change default tags:
```javascript
const defaultTags = [
  { name: 'Your Tag', color: '#FF6B6B', is_positive: 1 },
  // Add more...
];
```

### Change Point-to-Minute Ratio

Currently 1:1 (1 point = 1 minute). To change:
- Update display text in `public/app.js` line 77
- Adjust calculation logic as needed

### Add More Kids

The app supports 2 kids by default. To add more:
1. Edit `server.js` line 48-49 to add more default kids
2. UI will automatically accommodate additional kids

## 📁 Project Structure

```
kids-points-tracker/
├── server.js           # Express server & API endpoints
├── package.json        # Dependencies
├── points.db          # SQLite database (created on first run)
├── public/
│   ├── index.html     # Main HTML structure
│   ├── styles.css     # Mobile-first CSS styling
│   └── app.js         # Frontend JavaScript
└── README.md          # This file
```

## 🛠️ Technical Details

**Backend**:
- Node.js + Express
- SQLite database (better-sqlite3)
- RESTful API

**Frontend**:
- Vanilla JavaScript (no frameworks)
- Mobile-first responsive CSS
- Touch-optimized UI

**Database Schema**:
- `kids` - id, name, initials, color, balance
- `transactions` - id, kid_id, points, tag, note, timestamp
- `tags` - id, name, color, is_positive

## 🔒 Security Notes

- Password is hardcoded (suitable for family use)
- No user accounts or external authentication
- Database is local to the server
- Change default password before deployment
- Consider adding HTTPS in production

## 🐛 Troubleshooting

**App won't start**:
- Check Node.js version: `node --version` (needs 16+)
- Run `npm install` again
- Check if port 3000 is already in use

**Can't login**:
- Check password in `server.js`
- Clear browser cache
- Check browser console for errors

**Database issues**:
- Delete `points.db` file to reset
- App will recreate with defaults

**Deployment issues**:
- Ensure build command is `npm install`
- Start command should be `npm start`
- Check platform logs for errors

## 💡 Tips for Parents

1. **Start with zero** - Let kids earn their first points
2. **Be consistent** - Use the same tags for same activities
3. **Review together** - Show kids the activity log
4. **Adjust values** - Find point values that work for your family
5. **Weekend rewards** - Cash in points for screen time on weekends
6. **Bonus points** - Give extra for exceptional behavior
7. **Weekly reset** - Consider resetting points each week

## 🎯 Use Cases

- Track chores completion
- Reward good behavior
- Manage screen time
- Encourage healthy eating
- Teach delayed gratification
- Gamify household responsibilities

## 📝 Future Ideas

- Add achievements/badges
- Weekly/monthly reports
- Export data to CSV
- Multiple point types (screen time, treats, allowance)
- Photo uploads for completed tasks
- Parent mobile app notifications

## 🤝 Support

For issues or questions:
1. Check this README
2. Review troubleshooting section
3. Check browser console for errors
4. Verify server logs

## 📄 License

ISC License - Free for personal use

---

**Made with ❤️ for busy parents and awesome kids!**
