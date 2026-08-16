(function(){
  'use strict';

  window.ACT_SCENES={
    1:{
      src:'assets/scenes/act-01-village.png',
      alt:'1588년 향촌 장터에서 양반과 상민, 노비가 서로 거리를 둔 채 오가고 아전이 호적을 펼쳐 든 모습',
      caption:'평온한 장터에도 신분의 거리는 있었다 · 1588—1592'
    },
    2:{
      src:'assets/scenes/act-02-invasion.png',
      alt:'1592년 왜군 조총병과 아시가루가 마을로 들어오자 가족을 이끌고 달아나는 백성과 우왕좌왕하는 조선 관리들',
      caption:'수도가 무너지기 전, 마을이 먼저 흩어졌다 · 1592'
    },
    3:{
      src:'assets/scenes/act-03-war-life.png',
      alt:'전쟁이 길어진 강나루에서 군량을 나르는 백성, 의병과 관군, 피란민과 부상자가 뒤섞인 모습',
      caption:'승전보 뒤에서 군량과 사람의 등이 닳았다 · 1593—1597'
    },
    4:{
      src:'assets/scenes/act-04-recovery.png',
      alt:'불탄 마을에 집을 다시 세우고 논을 개간하는 사람들 사이로 귀환 포로와 장사꾼, 호적 아전이 모인 모습',
      caption:'전쟁은 끝나 가도 삶은 처음부터 다시 지어야 했다 · 1597—1605'
    },
    5:{
      src:'assets/scenes/act-05-reform.png',
      alt:'쌀가마가 쌓인 관아 창고 앞에서 농민과 상인, 관리가 저울과 공물 납부 문서를 둘러싸고 부담을 다투는 모습',
      caption:'개혁의 쌀도 누군가의 저울을 거쳤다 · 1608—1616'
    },
    6:{
      src:'assets/scenes/act-06-mobilization.png',
      alt:'큰 목재를 나르는 부역꾼과 군량을 내는 가족 곁으로 군사 행렬이 지나가는 대규모 동원 현장',
      caption:'북방의 전쟁과 조정의 다툼은 같은 백성의 등을 불렀다 · 1616—1621'
    },
    7:{
      src:'assets/scenes/act-07-coup.png',
      alt:'1623년 밤 횃불을 든 반정군이 도성으로 몰려가고 백성과 관리들이 숨거나 소문을 나누는 혼란한 거리',
      caption:'왕이 바뀐 밤, 어제의 충성이 오늘의 죄가 됐다 · 1623—1624'
    },
    8:{
      src:'assets/scenes/act-08-first-man.png',
      alt:'정묘호란 전후 강나루에서 피란민과 군량 수레가 길게 늘어서고 관리들이 곡식과 사람을 조사하는 모습',
      caption:'호패 단속과 첫 호란 뒤의 화친은 긴 불안의 시작이었다 · 1626—1633'
    },
    9:{
      src:'assets/scenes/act-09-siege.png',
      alt:'눈 덮인 남한산성을 군대가 에워싼 가운데 산 아래에서 추위와 굶주림을 견디는 피란민들',
      caption:'성 안의 마흔다섯 날, 성 밖의 더 긴 겨울 · 1636—1637'
    },
    10:{
      src:'assets/scenes/act-10-ransom.png',
      alt:'병자호란 뒤 관아 뜰에서 포로 가족들이 속환 명단과 저울 앞에 줄을 서고 동전과 물건을 모으는 모습',
      caption:'돌아오는 길에도 몸값과 낙인이 기다렸다 · 1638'
    },
    11:{
      src:'assets/scenes/act-11-new-order.png',
      alt:'명청 교체기의 관아 게시판 앞에서 관리와 군사, 장사꾼과 백성이 새 국제 질서의 소식을 두고 논쟁하는 모습',
      caption:'명이 무너진 뒤에도 백성의 하루는 계속됐다 · 1641—1645'
    },
    12:{
      src:'assets/scenes/act-12-legacy.png',
      alt:'회복된 마을의 공동 창고와 장터, 서당에서 아이들과 어른들이 곡식과 약재, 물품 내역과 배움을 이어 가는 모습',
      caption:'살아남은 기록은 한 사람의 무용담보다 오래갔다 · 1649—2026'
    }
  };
  Object.keys(window.ACT_SCENES).forEach(function(key){var src=window.ACT_SCENES[key].src;if(src&&src.indexOf('?')<0)window.ACT_SCENES[key].src=src+'?v=20260816-3';});
  window.CHAPTER_SCENES={
    17:{
      src:window.ACT_SCENES[3].src,
      alt:'1597년 왜성 전투가 이어지는 강나루에서 군량을 나르는 백성과 부상병, 피란민이 뒤섞인 모습',
      caption:'왜성 전투 뒤에도 군량과 피란민의 겨울은 끝나지 않았다 · 1597—1598'
    },
    39:{
      src:window.ACT_SCENES[8].src,
      alt:'1636년 국경 소문이 번지는 강나루에서 피란 준비와 호적 확인에 몰린 백성과 관리들',
      caption:'화친과 척화를 다투는 동안 국경 소문은 민가의 피란 준비가 됐다 · 1636'
    },
    40:{
      src:window.ACT_SCENES[8].src,
      alt:'1636년 사신 파탄 소식 뒤 수레와 배급표를 둘러싸고 술렁이는 백성과 관리들',
      caption:'사신이 떠난 뒤 장터와 관아는 다음 침공을 두려워했다 · 1636'
    }
  };
})();
