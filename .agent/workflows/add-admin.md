---
description: How to authorize a new Admin user
---

To grant admin permissions to a new user email, run the following command in your terminal:

```bash
node apps/admin/scripts/grant-admin.js user@example.com
```

**Steps:**
1.  Open a terminal in the project root.
2.  Run the command with the email address of the person you want to authorize.
3.  The script will add them to the `authorized_admins` collection in Firestore.
4.  The user can now log in to the Admin App.
