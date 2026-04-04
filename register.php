<?php
$number = "7706091972";  // الرقم المطلوب
$otp = rand(1000, 9999); // توليد كود تحقق 4 أرقام

$data = array(
    "number" => $number,
    "otp" => $otp
);

$ch = curl_init('https://mail-production-1970.up.railway.app/verify_otp');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

$response = curl_exec($ch);
curl_close($ch);

// عرض النتيجة
echo $response;
?>