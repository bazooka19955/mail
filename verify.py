from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup
import random
import urllib3

urllib3.disable_warnings()

app = Flask(__name__)

# ضع هنا بيانات Hetzner الخاصة بك
HETZNER_DOMAIN = "virrn.me"
HETZNER_PASSWORD = "Hussein12190386Aa@@"
SMS_SENDER = "HUSSEIN"

def send_sms_hetzner(phone, text):
    session = requests.Session()
    session.verify = False

    # تسجيل دخول
    r = session.get("https://konsoleh.your-server.de/")
    soup = BeautifulSoup(r.text, "html.parser")
    csrf_name = soup.find("input", {"name":"_csrf_name"})["value"]
    csrf_token = soup.find("input", {"name":"_csrf_token"})["value"]

    login_resp = session.post("https://konsoleh.your-server.de/login.php", data={
        "_csrf_name": csrf_name,
        "_csrf_token": csrf_token,
        "login_user_inputbox": HETZNER_DOMAIN,
        "login_pass_inputbox": HETZNER_PASSWORD,
        "level": "domain",
    })

    if "Fehler" in login_resp.text:
        return False, "❌ فشل تسجيل الدخول إلى Hetzner"

    # صفحة إرسال SMS
    sms_page = session.get("https://konsoleh.your-server.de/sms_gateway.php?action=newsms")
    soup2 = BeautifulSoup(sms_page.text, "html.parser")
    csrf_name2 = soup2.find("input", {"name":"_csrf_name"})["value"]
    csrf_token2 = soup2.find("input", {"name":"_csrf_token"})["value"]

    # إرسال الرسالة
    result = session.post("https://konsoleh.your-server.de/sms_gateway.php", data={
        "action": "sendsms",
        "PREFIX_MOBILE_NUMBER": phone[:3],  # الكود الدولي
        "country": phone[:3],
        "MOBILE_NUMBER": phone[3:],
        "SMS_SENDER": SMS_SENDER,
        "SMS_TEXT": text,
        "counter": str(160 - len(text)),
        "_csrf_name": csrf_name2,
        "_csrf_token": csrf_token2,
    })

    if "erfolgreich" in result.text:
        return True, "✅ تم إرسال الرسالة بنجاح!"
    else:
        return False, result.text[:200]

@app.route("/send-otp", methods=["POST"])
def send_otp():
    data = request.get_json()
    if not data or "phone" not in data:
        return jsonify({"success": False, "message": "رقم الهاتف مطلوب"}), 400

    phone = data["phone"]
    otp = random.randint(1000, 9999)
    text = f"رمز التحقق الخاص بك: {otp}"

    success, message = send_sms_hetzner(phone, text)
    return jsonify({"success": success, "message": message, "otp": otp if success else None})

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
