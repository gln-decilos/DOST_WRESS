from flask_mail import Message
from app.extensions import mail


def send_user_credentials(email, full_name, password):
    try:
        msg = Message(
            subject="Your Account Credentials",
            recipients=[email],
            body=f"""
Hello {full_name},

Your account has been created.

Email: {email}
Password: {password}
"""
        )

        mail.send(msg)
        print("✅ Email sent successfully to", email)

    except Exception as e:
        print("❌ Email failed:", str(e))