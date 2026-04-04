import sys
import requests
from bs4 import BeautifulSoup

phone = sys.argv[1]
code  = sys.argv[2]

def send_sms(number, text):
    session = requests.Session()
    session.verify = False

    # تسجيل دخول Hetzner
    r = session.get('https://konsoleh.your-server.de/')
    soup = BeautifulSoup(r.text, 'html.parser')
    csrf_name  = soup.find('input', {'name':'_csrf_name'})['value']
    csrf_token = soup.find('input', {'name':'_csrf_token'})['value']

    session.post('https://konsoleh.your-server.de/login.php', data={
        '_csrf_name': csrf_name,
        '_csrf_token': csrf_token,
        'login_user_inputbox': 'virrn.me',
        'login_pass_inputbox': 'Hussein12190386Aa@@',
        'level': 'domain'
    })

    # جيب CSRF جديد لإرسال SMS
    sms_page = session.get('https://konsoleh.your-server.de/sms_gateway.php?action=newsms')
    soup2 = BeautifulSoup(sms_page.text, 'html.parser')
    csrf_name2  = soup2.find('input', {'name':'_csrf_name'})['value']
    csrf_token2 = soup2.find('input', {'name':'_csrf_token'})['value']

    # إرسال الرسالة
    result = session.post('https://konsoleh.your-server.de/sms_gateway.php', data={
        'action': 'sendsms',
        'PREFIX_MOBILE_NUMBER': '964',
        'country': '964',
        'MOBILE_NUMBER': number,
        'SMS_SENDER': 'HUSSEIN',
        'SMS_TEXT': text,
        'counter': str(160-len(text)),
        '_csrf_name': csrf_name2,
        '_csrf_token': csrf_token2
    })

    if 'erfolgreich' in result.text:
        print(f"✅ تم إرسال الرسالة لكود التحقق: {text}")
    else:
        print(f"❌ فشل الإرسال: {result.text[:200]}")

send_sms(phone, code)
