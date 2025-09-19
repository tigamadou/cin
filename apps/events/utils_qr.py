import qrcode
from io import BytesIO
from django.core.files.base import ContentFile
import base64


def generate_qr_image_bytes(data: str):
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')
    bio = BytesIO()
    img.save(bio, format='PNG')
    bio.seek(0)
    return bio.getvalue()


def qr_bytes_to_base64(qr_bytes: bytes) -> str:
    return base64.b64encode(qr_bytes).decode('utf-8')
