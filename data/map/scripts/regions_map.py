"""Grouping of provinces into regions for Concordia's active countries.

Criterion (game design document, module 2): regions = groups of complete neighboring
provinces. If the country has an official regionalization of similar size, it is used.

Region names are proper names shown in the game and stay as written here.
"""

ACTIVE = ["ARG", "BRA", "CHL", "PRY", "MEX", "USA", "CAN", "ESP", "ITA", "PRT", "DEU", "FRA", "GBR"]

# Country colors: distinct between active neighbors. Argentina light blue and Spain red.
COLORS = {
    "ARG": "#6CACE4", "ESP": "#D0453A", "BRA": "#4FA35A", "CHL": "#8E5BB5",
    "PRY": "#E0A33A", "MEX": "#2E8B7A", "USA": "#3C5A9A", "CAN": "#A0703F",
    "ITA": "#5BB3A5", "PRT": "#2F6E45", "DEU": "#D9B737", "FRA": "#4E79C4",
    "GBR": "#A8558F",
}

BY_NAME = {
    "ARG": {
        "Buenos Aires": ["Buenos Aires", "Ciudad de Buenos Aires"],
        "Córdoba y el Litoral": ["Córdoba", "Santa Fe", "Entre Ríos"],
        "Norte Andino": ["Jujuy", "Salta", "Tucumán", "Catamarca", "Santiago del Estero"],
        "Gran Chaco y Misiones": ["Misiones", "Corrientes", "Chaco", "Formosa"],
        "Cuyo": ["Mendoza", "San Juan", "San Luis", "La Rioja"],
        "Patagonia": ["La Pampa", "Neuquén", "Río Negro", "Chubut", "Santa Cruz", "Tierra del Fuego"],
    },
    "BRA": {
        "Alto Amazonas": ["Amazonas", "Roraima"],
        "Grão-Pará": ["Pará", "Amapá", "Tocantins"],
        "Acre y Rondônia": ["Acre", "Rondônia"],
        "Meio-Norte": ["Maranhão", "Piauí"],
        "Ceará y Borborema": ["Ceará", "Rio Grande do Norte", "Paraíba"],
        "Pernambuco y São Francisco": ["Pernambuco", "Alagoas", "Sergipe"],
        "Bahía": ["Bahia"],
        "Planalto Central y Pantanal": ["Mato Grosso", "Mato Grosso do Sul", "Goiás", "Distrito Federal"],
        "São Paulo": ["São Paulo"],
        "Minas Gerais": ["Minas Gerais"],
        "Rio de Janeiro y Espírito Santo": ["Rio de Janeiro", "Espírito Santo"],
        "Pampa Gaúcha y Paraná": ["Paraná", "Santa Catarina", "Rio Grande do Sul"],
    },
    "CHL": {
        "Norte Grande": ["Arica y Parinacota", "Tarapacá", "Antofagasta"],
        "Norte Chico": ["Atacama", "Coquimbo"],
        "Valle Central": ["Valparaíso", "Región Metropolitana de Santiago", "Libertador General Bernardo O'Higgins", "Maule"],
        "Biobío y Los Lagos": ["Ñuble", "Bío-Bío", "La Araucanía", "Los Ríos", "Los Lagos"],
        "Patagonia Chilena": ["Aisén del General Carlos Ibáñez del Campo", "Magallanes y Antártica Chilena"],
    },
    "PRY": {
        "Chaco Paraguayo": ["Presidente Hayes", "Boquerón", "Alto Paraguay"],
        "Alto Paraná y Amambay": ["Concepción", "San Pedro", "Amambay", "Canindeyú", "Caaguazú", "Alto Paraná"],
        "Asunción e Itapúa": ["Asunción", "Central", "Cordillera", "Paraguarí", "Guairá", "Caazapá", "Itapúa", "Misiones", "Ñeembucú"],
    },
    "MEX": {
        "Sonora y las Californias": ["Baja California", "Baja California Sur", "Sonora", "Sinaloa"],
        "Chihuahua y Durango": ["Chihuahua", "Durango"],
        "Sierra Madre Oriental": ["Coahuila", "Nuevo León", "Tamaulipas", "San Luis Potosí"],
        "Jalisco y Michoacán": ["Jalisco", "Nayarit", "Colima", "Michoacán", "Aguascalientes", "Zacatecas"],
        "Valle de México y el Bajío": ["Distrito Federal", "México", "Morelos", "Hidalgo", "Puebla", "Tlaxcala", "Querétaro", "Guanajuato"],
        "Oaxaca y Chiapas": ["Guerrero", "Oaxaca", "Chiapas"],
        "Yucatán y el Golfo": ["Veracruz", "Tabasco", "Campeche", "Yucatán", "Quintana Roo", None],
    },
    "DEU": {
        "Mar del Norte y Báltico": ["Schleswig-Holstein", "Hamburg", "Niedersachsen", "Bremen", "Mecklenburg-Vorpommern"],
        "Renania del Norte-Westfalia": ["Nordrhein-Westfalen"],
        "Valle del Rin": ["Hessen", "Rheinland-Pfalz", "Saarland", "Baden-Württemberg"],
        "Berlín y Sajonia": ["Berlin", "Brandenburg", "Sachsen", "Sachsen-Anhalt", "Thüringen"],
        "Baviera": ["Bayern"],
    },
}

BY_POSTAL = {
    "USA": {  # the 9 United States census divisions
        "Nueva Inglaterra": "CT ME MA NH RI VT",
        "Atlántico Medio": "NJ NY PA",
        "Grandes Lagos": "IL IN MI OH WI",
        "Grandes Llanuras": "IA KS MN MO NE ND SD",
        "Carolinas y Florida": "DE DC FL GA MD NC SC VA WV",
        "Tennessee y Misisipi": "AL KY MS TN",
        "Texas y Luisiana": "AR LA OK TX",
        "Montañas Rocosas": "AZ CO ID MT NV NM UT WY",
        "Pacífico y Alaska": "AK CA HI OR WA",
    },
    "CAN": {
        "Provincias Atlánticas": "NB NL NS PE",
        "Quebec": "QC",
        "Ontario": "ON",
        "Praderas": "AB MB SK",
        "Columbia Británica": "BC",
        "Yukón y el Ártico": "YT NT NU",
    },
}

BY_REGION_FIELD = {
    "ESP": {  # NUTS 1
        "Galicia y el Cantábrico": ["Galicia", "Asturias", "Cantabria"],
        "País Vasco y el Ebro": ["País Vasco", "Foral de Navarra", "La Rioja", "Aragón"],
        "Madrid": ["Madrid"],
        "Castillas y Extremadura": ["Castilla y León", "Castilla-La Mancha", "Extremadura"],
        "Cataluña y Levante": ["Cataluña", "Valenciana", "Islas Baleares"],
        "Andalucía y Murcia": ["Andalucía", "Murcia", "Ceuta", "Melilla"],
        "Canarias": ["Canary Is."],
    },
    "ITA": {  # NUTS 1
        "Lombardía y Piamonte": ["Piemonte", "Valle d'Aosta", "Liguria", "Lombardia"],
        "Véneto y Emilia": ["Trentino-Alto Adige", "Veneto", "Friuli-Venezia Giulia", "Emilia-Romagna"],
        "Toscana y Lacio": ["Toscana", "Umbria", "Marche", "Lazio"],
        "Mezzogiorno": ["Abruzzo", "Molise", "Campania", "Apulia", "Basilicata", "Calabria"],
        "Sicilia y Cerdeña": ["Sicily", "Sardegna"],
    },
    "FRA": {
        "París y el Canal": ["Île-de-France", "Hauts-de-France", "Normandie"],
        "Bretaña y Loira": ["Bretagne", "Pays de la Loire", "Centre-Val de Loire"],
        "Alsacia y Borgoña": ["Grand Est", "Bourgogne-Franche-Comté"],
        "Aquitania y Occitania": ["Nouvelle-Aquitaine", "Occitanie"],
        "Ródano y Provenza": ["Auvergne-Rhône-Alpes", "Provence-Alpes-Côte-d'Azur", "Corse"],
        "Francia de Ultramar": ["Guyane française", "Martinique", "Guadeloupe", "Réunion", "Mayotte"],
    },
}


def region_of(p):
    """Returns the region name of a province of an active country."""
    c = p["adm0_a3"]
    name = p.get("name")
    if c in BY_NAME:
        for r, names in BY_NAME[c].items():
            if name in names:
                return r
    elif c in BY_POSTAL:
        code = (p.get("postal") or "").strip()
        for r, codes in BY_POSTAL[c].items():
            if code in codes.split():
                return r
    elif c in BY_REGION_FIELD:
        reg = (p.get("region") or "").strip()
        for r, regs in BY_REGION_FIELD[c].items():
            if reg in regs:
                return r
    elif c == "PRT":  # NUTS 1
        if name == "Azores":
            return "Azores"
        if name == "Madeira":
            return "Madeira"
        return "Portugal Continental"
    elif c == "GBR":
        return {"England": "Inglaterra", "Scotland": "Escocia", "Wales": "Gales",
                "Northern Ireland": "Irlanda del Norte"}[p.get("geonunit")]
    raise KeyError(f"No region for: {c} {name!r}")
