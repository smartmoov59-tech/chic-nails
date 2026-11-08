/* ------------------------------------------------------------------
   Données du site Chic Nails — modifiables ici (prix, horaires, contact).
   Tarifs relevés sur la fiche Planity du salon le 03/11/2026.
   Format d'une prestation : [nom, durée en minutes, prix en € (ou texte)]
------------------------------------------------------------------- */
window.CHIC = {
  phone: '+33766405871',
  phoneDisplay: '07 66 40 58 71',
  email: 'chicnailsbar@yahoo.fr',
  address: 'CC Carrefour La Pioline, 1175 rue Guillaume du Vair, 13290 Aix-en-Provence',
  planity: 'https://www.planity.com/chic-nails-cc-carrefour-la-pioline-13290-aix-en-provence',
  // Ouvert du lundi au samedi (0 = dimanche). Heures au format [h, min]
  hours: {
    1: [[9, 30], [19, 30]], 2: [[9, 30], [19, 30]], 3: [[9, 30], [19, 30]],
    4: [[9, 30], [19, 30]], 5: [[9, 30], [19, 30]], 6: [[9, 30], [19, 30]], 0: null
  },
  carte: [
    { id: 'mains', label: 'Mains', items: [
      ['Manucure classique + soin', 20, 20],
      ['Manucure brésilienne', 30, 30],
      ['Manucure japonaise', 35, 45],
      ['Pose de vernis couleur (200 teintes)', 15, 15],
      ['French', 10, 10]
    ]},
    { id: 'semi', label: 'Semi-permanent', items: [
      ['Vernis semi-permanent couleur mains (400 teintes)', 30, 35],
      ['Dépose suivie d’une nouvelle pose', 45, 40],
      ['Semi-permanent + soin renfort ongles', 40, 45],
      ['French', 10, 10],
      ['Réparation d’un ongle (sans rallonger)', 6, 5]
    ]},
    { id: 'gel', label: 'Gel & rallongement', items: [
      ['Rallongement capsule + couleur', 60, 65],
      ['Rallongement chablon / Poppit gel + couleur', 70, 75],
      ['Remplissage gel + couleur', 60, 50],
      ['Gel sur ongles naturels', 45, 50],
      ['French', 15, 10]
    ]},
    { id: 'artnail', label: 'Strass & nail art', items: [
      ['Strass (l’unité)', 2, 1],
      ['Nail art', 5, 'sur devis']
    ]},
    { id: 'pieds', label: 'Pieds', items: [
      ['Beauté des pieds + soin', 40, 20],
      ['Beauté des pieds brésilienne', 30, 35],
      ['Beauté des pieds russe', 45, 50],
      ['Pose de vernis simple pieds', 15, 15],
      ['Vernis semi-permanent pieds', 30, 35]
    ]},
    { id: 'depose', label: 'Dépose', items: [
      ['Dépose vernis classique', 5, 5],
      ['Dépose vernis semi-permanent', 10, 10],
      ['Dépose gel (posé chez Chic Nails)', 20, 20],
      ['Dépose gel (autre institut)', 30, 30]
    ]},
    { id: 'forfaits', label: 'Forfaits', items: [
      ['Manucure brésilienne + semi-permanent', 60, 60],
      ['Beauté des pieds brésilienne + semi couleur', 60, 70]
    ]},
    { id: 'homme', label: 'Homme', items: [
      ['Manucure classique', 20, 25],
      ['Manucure russe', 30, 30],
      ['Manucure brésilienne', 25, 35],
      ['Soin des pieds classique', 25, 35],
      ['Beauté des pieds brésilienne', 60, 45]
    ]},
    { id: 'regard', label: 'Sourcils', items: [
      ['Création sourcils', 20, 20],
      ['Sourcils entretien', 10, 15],
      ['Épilation des sourcils au fil', 15, 18],
      ['Teinture sourcils 3D au henné végétal', 20, 35],
      ['Browlift', 35, 45]
    ]},
    { id: 'epil', label: 'Épilations', items: [
      ['Lèvres', 10, 10],
      ['Aisselles', 15, 15],
      ['Demi-bras', 15, 20],
      ['Bras complets', 30, 30],
      ['Demi-jambes', 30, 30]
    ]},
    { id: 'beaute', label: 'Make-up & visage', note: 'Sur demande : ces prestations se réservent directement auprès du salon (téléphone ou SMS).', items: [
      ['Make-up jour', 30, 20],
      ['Make-up soirée', 45, 50],
      ['Make-up mariée / contouring', 60, 65],
      ['Soin visage flash', 40, 45],
      ['Microneedling', 45, 85]
    ]}
  ]
};
