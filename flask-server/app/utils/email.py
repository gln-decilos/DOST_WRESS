from flask_mail import Message
from app.extensions import mail

def send_user_credentials(email, full_name, password):
    """
    Sends account credentials to a newly registered user.
    """

    if not all([email, full_name, password]):
        print("Email failed: Missing required fields.")
        return

    subject = "Your Account Credentials"

    body = f"""
Dear {full_name},

Your account has been successfully created. Please find your login credentials below:

Email: {email}
Password: {password}

For security reasons, we recommend changing your password after your first login.

Best regards,
WRESS Team
"""

    msg = Message(
        subject=subject,
        recipients=[email],
        body=body.strip()
    )

    try:
        mail.send(msg)
        print(f"Email sent successfully to {email}")

    except Exception as e:
        print(f"Email failed to {email}: {str(e)}")

def send_password_reset_email(email, full_name, reset_link):
    try:
        msg = Message(
            subject="Password Reset Request",
            recipients=[email],
        )

        msg.body = f"""
Hello {full_name},

You requested to reset your password.

Click the link below to reset it:
{reset_link}

This link will expire in 15 minutes.

If you did not request this, please ignore this email.
"""

        msg.html = f"""
<h3>Password Reset Request</h3>
<p>Hello {full_name},</p>
<p>You requested to reset your password.</p>
<p>
    <a href="{reset_link}" style="padding:10px 15px;background:#4f46e5;color:white;text-decoration:none;border-radius:5px;">
        Reset Password
    </a>
</p>
<p>This link will expire in 15 minutes.</p>
<p>If you did not request this, please ignore this email.</p>
"""

        mail.send(msg)

    except Exception as e:
        print("PASSWORD RESET EMAIL ERROR:", str(e))