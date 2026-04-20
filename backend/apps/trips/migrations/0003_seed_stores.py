from django.db import migrations

STORES = [
    ("Akshay Nagar ES-73", "ES-73", "Akshay Nagar"),
    ("BTM 2nd Stage ES-89", "ES-89", "BTM"),
    ("Balagere Road ES-36", "ES-36", "Balagere Road"),
    ("Belathur ES-141", "ES-141", "Belathur"),
    ("Budigere ES-108", "ES-108", "Budigere"),
    ("Devarbisanahalli ES-273", "ES-273", "Devarbisanahalli"),
    ("Doddakanelli ES-314", "ES-314", "Doddakanelli"),
    ("Doddanekundi ES-138", "ES-138", "Doddanekundi"),
    ("Domalur ES-190", "ES-190", "Domalur"),
    ("E-City Phase-1 ES-46", "ES-46", "E-City Phase 1"),
    ("E-City ES-18", "ES-18", "E-City"),
    ("E-City ES-251", "ES-251", "E-City"),
    ("Frazer Town ES-43", "ES-43", "Frazer Town"),
    ("Gopalan Colony Whitefield ES-282", "ES-282", "Gopalan Colony Whitefield"),
    ("HSR Layout ES-261", "ES-261", "HSR Layout"),
    ("Haralur ES-25", "ES-25", "Haralur"),
    ("Hebbal RT Nagar ES-252", "ES-252", "Hebbal RT Nagar"),
    ("Hebbal RT Nagar ES-255", "ES-255", "Hebbal RT Nagar"),
    ("Hoodi 2 ES-109", "ES-109", "Hoodi"),
    ("Hoodi 3 ES-294", "ES-294", "Hoodi"),
    ("Hoodi ES-72", "ES-72", "Hoodi"),
    ("Horamavu ES-125", "ES-125", "Horamavu"),
    ("Horamavu Vibgyor ES-269", "ES-269", "Horamavu"),
    ("Hosur Road ES-52", "ES-52", "Hosur Road"),
    ("Hosur Road ES-126", "ES-126", "Hosur Road"),
    ("Hulimavu ES-106", "ES-106", "Hulimavu"),
    ("Hulimavu ES-199", "ES-199", "Hulimavu"),
    ("Hulimavu ES-315", "ES-315", "Hulimavu"),
    ("ITI Layout ES-105", "ES-105", "ITI Layout"),
    ("Indiranagar ES-132", "ES-132", "Indiranagar"),
    ("JP Nagar 8th Phase ES-56", "ES-56", "JP Nagar"),
    ("Kaggadaspura ES-276", "ES-276", "Kaggadaspura"),
    ("Kengeri ES-115", "ES-115", "Kengeri"),
    ("Lalbagh Road ES-244", "ES-244", "Lalbagh Road"),
    ("LHR Layout E-City ES-274", "ES-274", "LHR Layout"),
    ("Lingarajapuram ES-256", "ES-256", "Lingarajapuram"),
    ("Magadi Road ES-114", "ES-114", "Magadi Road"),
    ("Mallathahalli Lake ES-168", "ES-168", "Mallathahalli Lake"),
    ("Marathahalli ES-19", "ES-19", "Marathahalli"),
    ("Marathahalli ES-88", "ES-88", "Marathahalli"),
    ("New Sanjay Nagar ES-98", "ES-98", "New Sanjay Nagar"),
    ("Pai Layout ES-57", "ES-57", "Pai Layout"),
    ("Purnapragnya Uttarahalli ES-279", "ES-279", "Purnapragnya Uttarahalli"),
    ("Rajaji Nagar ES-312", "ES-312", "Rajaji Nagar"),
    ("Sarjapur ES-310", "ES-310", "Sarjapur"),
    ("Sobha Oasis ES-120", "ES-120", "Sobha Oasis"),
    ("Talaghatta Pura ES-155", "ES-155", "Talaghatta Pura"),
    ("Tavarekere Palya ES-304", "ES-304", "Tavarekere Palya"),
    ("Thanisandra ES-13", "ES-13", "Thanisandra"),
    ("Thanisandra Kannur ES-295", "ES-295", "Thanisandra Kannur"),
    ("Tubrahalli ES-131", "ES-131", "Tubrahalli"),
    ("Tubrahalli ES-234", "ES-234", "Tubrahalli"),
    ("Kannamangala ES-291", "ES-291", "Kannamangala"),
    ("Gopalan Colony Whitefield ES-122", "ES-122", "Gopalan Colony Whitefield"),
    ("Gopalan Colony Whitefield ES-169", "ES-169", "Gopalan Colony Whitefield"),
    ("Agara Village ES-158", "ES-158", "Agara Village"),
]


def seed_stores(apps, schema_editor):
    Store = apps.get_model('trips', 'Store')
    for name, code, area in STORES:
        Store.objects.get_or_create(name=name, defaults={'code': code, 'area': area})


def unseed_stores(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('trips', '0002_store_trip_category_trip_created_by'),
    ]

    operations = [
        migrations.RunPython(seed_stores, unseed_stores),
    ]
