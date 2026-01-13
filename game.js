// 게임 상태
let scene, camera, renderer, controls;
let gameState = {
    inventory: [],
    timeLeft: 600, // 10분
    gameStarted: false,
    gameWon: false,
    puzzlesSolved: 0
};

// 상호작용 가능한 객체들
let interactableObjects = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// 카메라 회전 상태
let cameraRotation = {
    yaw: 0,   // 좌우 회전
    pitch: 0  // 상하 회전
};

// 키 입력 상태
let keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false
};

// 이동 속도
const moveSpeed = 0.05;
const runSpeed = 0.08;

// 게임 초기화
function init() {
    // Scene 생성
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    
    // Camera 생성
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0); // 사람 눈높이
    
    // Renderer 생성
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('gameContainer').appendChild(renderer.domElement);
    
    // 조명 설정
    setupLighting();
    
    // 방 생성
    createRoom();
    
    // 퍼즐 객체들 생성
    createPuzzleObjects();
    
    // 이벤트 리스너
    setupEventListeners();
    
    // 게임 시작
    startGame();
    
    // 렌더링 루프
    animate();
}

function setupLighting() {
    // 주변광
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);
    
    // 천장 조명
    const ceilingLight = new THREE.PointLight(0xffffff, 0.8, 100);
    ceilingLight.position.set(0, 4.5, 0);
    ceilingLight.castShadow = true;
    scene.add(ceilingLight);
    
    // 창문에서 들어오는 빛
    const windowLight = new THREE.DirectionalLight(0x87CEEB, 0.5);
    windowLight.position.set(5, 3, 0);
    windowLight.castShadow = true;
    scene.add(windowLight);
}

function createRoom() {
    // 바닥
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // 천장
    const ceilingGeometry = new THREE.PlaneGeometry(10, 10);
    const ceilingMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5;
    scene.add(ceiling);
    
    // 벽들
    createWalls();
    
    // 문 (잠겨있음)
    createDoor();
}

function createWalls() {
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
    
    // 앞벽 (문이 있는 벽)
    const frontWallLeft = new THREE.Mesh(new THREE.PlaneGeometry(3, 5), wallMaterial);
    frontWallLeft.position.set(-3.5, 2.5, -5);
    scene.add(frontWallLeft);
    
    const frontWallRight = new THREE.Mesh(new THREE.PlaneGeometry(3, 5), wallMaterial);
    frontWallRight.position.set(3.5, 2.5, -5);
    scene.add(frontWallRight);
    
    const frontWallTop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), wallMaterial);
    frontWallTop.position.set(0, 4, -5);
    scene.add(frontWallTop);
    
    // 뒷벽 (창문이 있는 벽)
    const backWallLeft = new THREE.Mesh(new THREE.PlaneGeometry(3, 5), wallMaterial);
    backWallLeft.position.set(-3.5, 2.5, 5);
    backWallLeft.rotation.y = Math.PI;
    scene.add(backWallLeft);
    
    const backWallRight = new THREE.Mesh(new THREE.PlaneGeometry(3, 5), wallMaterial);
    backWallRight.position.set(3.5, 2.5, 5);
    backWallRight.rotation.y = Math.PI;
    scene.add(backWallRight);
    
    // 창문 프레임
    const windowFrame = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 2.2, 0.1),
        new THREE.MeshLambertMaterial({ color: 0x8B4513 })
    );
    windowFrame.position.set(0, 3, 4.95);
    scene.add(windowFrame);
    
    // 좌벽
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial);
    leftWall.position.set(-5, 2.5, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);
    
    // 우벽
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial);
    rightWall.position.set(5, 2.5, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);
}

function createDoor() {
    const doorGeometry = new THREE.BoxGeometry(2, 3, 0.1);
    const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.5, -4.95);
    door.userData = { type: 'door', locked: true };
    scene.add(door);
    
    // 문 손잡이
    const handleGeometry = new THREE.SphereGeometry(0.1);
    const handleMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0.8, 1.5, -4.9);
    scene.add(handle);
    
    interactableObjects.push(door);
}
function createPuzzleObjects() {
    // 1. 책상과 서랍 (열쇠가 들어있음)
    createDesk();
    
    // 2. 책장 (암호가 적힌 책)
    createBookshelf();
    
    // 3. 금고 (최종 열쇠)
    createSafe();
    
    // 4. 그림 (힌트)
    createPainting();
    
    // 5. 화분 (숨겨진 아이템)
    createPlant();
}

function createDesk() {
    // 책상
    const deskGeometry = new THREE.BoxGeometry(3, 0.1, 1.5);
    const deskMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const desk = new THREE.Mesh(deskGeometry, deskMaterial);
    desk.position.set(-3, 1, 3);
    desk.castShadow = true;
    scene.add(desk);
    
    // 책상 다리들
    for(let i = 0; i < 4; i++) {
        const legGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
        const leg = new THREE.Mesh(legGeometry, deskMaterial);
        const x = i < 2 ? -4.4 : -1.6;
        const z = i % 2 === 0 ? 2.3 : 3.7;
        leg.position.set(x, 0.5, z);
        leg.castShadow = true;
        scene.add(leg);
    }
    
    // 서랍
    const drawerGeometry = new THREE.BoxGeometry(1, 0.3, 0.8);
    const drawerMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const drawer = new THREE.Mesh(drawerGeometry, drawerMaterial);
    drawer.position.set(-3, 0.8, 3);
    drawer.userData = { type: 'drawer', opened: false, hasKey: true };
    drawer.castShadow = true;
    scene.add(drawer);
    
    interactableObjects.push(drawer);
}

function createBookshelf() {
    // 책장 프레임
    const shelfGeometry = new THREE.BoxGeometry(2, 4, 0.3);
    const shelfMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const bookshelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
    bookshelf.position.set(4, 2, 3);
    bookshelf.castShadow = true;
    scene.add(bookshelf);
    
    // 책들
    for(let i = 0; i < 8; i++) {
        const bookGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.2);
        const bookColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500, 0x800080];
        const bookMaterial = new THREE.MeshLambertMaterial({ color: bookColors[i] });
        const book = new THREE.Mesh(bookGeometry, bookMaterial);
        book.position.set(3.2 + (i * 0.15), 2.5, 2.85);
        
        if(i === 3) { // 노란 책에 암호 힌트
            book.userData = { type: 'book', hasCode: true, code: '1234' };
            interactableObjects.push(book);
        }
        
        book.castShadow = true;
        scene.add(book);
    }
}

function createSafe() {
    // 금고
    const safeGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.6);
    const safeMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const safe = new THREE.Mesh(safeGeometry, safeMaterial);
    safe.position.set(3, 0.4, -3);
    safe.userData = { type: 'safe', locked: true, code: '1234', hasFinalKey: true };
    safe.castShadow = true;
    scene.add(safe);
    
    // 금고 다이얼
    const dialGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05);
    const dialMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const dial = new THREE.Mesh(dialGeometry, dialMaterial);
    dial.position.set(3, 0.4, -2.7);
    dial.rotation.x = Math.PI / 2;
    scene.add(dial);
    
    interactableObjects.push(safe);
}

function createPainting() {
    // 그림 프레임
    const frameGeometry = new THREE.BoxGeometry(1.5, 1, 0.1);
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(-3, 3, -4.9);
    frame.userData = { type: 'painting', hint: '숫자들이 숨어있다: 1-2-3-4' };
    frame.castShadow = true;
    scene.add(frame);
    
    // 그림 (캔버스)
    const canvasGeometry = new THREE.PlaneGeometry(1.3, 0.8);
    const canvasMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
    const canvas = new THREE.Mesh(canvasGeometry, canvasMaterial);
    canvas.position.set(-3, 3, -4.85);
    scene.add(canvas);
    
    interactableObjects.push(frame);
}

function createPlant() {
    // 화분
    const potGeometry = new THREE.CylinderGeometry(0.3, 0.2, 0.4);
    const potMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const pot = new THREE.Mesh(potGeometry, potMaterial);
    pot.position.set(-4, 0.2, -3);
    pot.userData = { type: 'plant', hasHint: true, hint: '금고 암호는 그림에 있다' };
    pot.castShadow = true;
    scene.add(pot);
    
    // 식물
    const plantGeometry = new THREE.ConeGeometry(0.2, 0.6);
    const plantMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const plant = new THREE.Mesh(plantGeometry, plantMaterial);
    plant.position.set(-4, 0.7, -3);
    plant.castShadow = true;
    scene.add(plant);
    
    interactableObjects.push(pot);
}

function setupEventListeners() {
    // 마우스 클릭
    renderer.domElement.addEventListener('click', onMouseClick);
    
    // 마우스 이동
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    
    // 키보드 - 키 다운
    document.addEventListener('keydown', onKeyDown);
    
    // 키보드 - 키 업
    document.addEventListener('keyup', onKeyUp);
    
    // 윈도우 리사이즈
    window.addEventListener('resize', onWindowResize);
}

function onMouseClick(event) {
    // 메시지가 표시되어 있으면 메시지 닫기가 우선
    const messageDiv = document.getElementById('message');
    if (messageDiv.style.display === 'block') {
        return; // showMessage에서 설정한 이벤트 리스너가 처리함
    }
    
    // 포인터 락이 활성화된 경우에만 객체 상호작용 처리
    if (document.pointerLockElement === renderer.domElement) {
        // 화면 중앙에서 레이캐스팅 (포인터 락 시 마우스는 항상 중앙)
        mouse.x = 0;
        mouse.y = 0;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactableObjects);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            handleObjectInteraction(object);
        }
    }
}

function handleObjectInteraction(object) {
    const userData = object.userData;
    
    switch(userData.type) {
        case 'drawer':
            if (!userData.opened) {
                showMessage('서랍을 열었습니다! 작은 열쇠를 발견했습니다.');
                addToInventory('작은 열쇠');
                userData.opened = true;
                gameState.puzzlesSolved++;
            } else {
                showMessage('이미 빈 서랍입니다.');
            }
            break;
            
        case 'book':
            if (userData.hasCode) {
                showMessage('책에서 숫자를 발견했습니다: ' + userData.code);
                addToInventory('암호 힌트: ' + userData.code);
                gameState.puzzlesSolved++;
            }
            break;
            
        case 'safe':
            if (userData.locked) {
                if (gameState.inventory.includes('암호 힌트: 1234')) {
                    showMessage('금고가 열렸습니다! 방 열쇠를 얻었습니다!');
                    addToInventory('방 열쇠');
                    userData.locked = false;
                    gameState.puzzlesSolved++;
                } else {
                    showMessage('암호가 필요합니다. 힌트를 찾아보세요.');
                }
            } else {
                showMessage('이미 열린 금고입니다.');
            }
            break;
            
        case 'painting':
            showMessage('그림을 자세히 보니 ' + userData.hint);
            break;
            
        case 'plant':
            showMessage('화분을 뒤져보니 쪽지가 있습니다: ' + userData.hint);
            break;
            
        case 'door':
            if (userData.locked) {
                if (gameState.inventory.includes('방 열쇠')) {
                    showMessage('축하합니다! 방탈출에 성공했습니다!');
                    gameState.gameWon = true;
                    userData.locked = false;
                } else {
                    showMessage('문이 잠겨있습니다. 열쇠가 필요합니다.');
                }
            }
            break;
    }
}
function onMouseMove(event) {
    // 포인터 락이 활성화된 경우에만 마우스 룩 작동
    if (document.pointerLockElement === renderer.domElement) {
        const sensitivity = 0.002;
        
        // 마우스 움직임 가져오기 (movementX/Y는 포인터 락에서만 사용 가능)
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        
        // 회전 각도 업데이트
        cameraRotation.yaw -= movementX * sensitivity;
        cameraRotation.pitch -= movementY * sensitivity;
        
        // 상하 회전 제한 (고개를 너무 위아래로 돌리지 못하게)
        cameraRotation.pitch = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, cameraRotation.pitch));
        
        // 카메라 회전 적용
        camera.rotation.order = 'YXZ';
        camera.rotation.y = cameraRotation.yaw;
        camera.rotation.x = cameraRotation.pitch;
    }
}

function onKeyDown(event) {
    if (!gameState.gameStarted || gameState.gameWon) return;
    
    switch(event.code) {
        case 'KeyW':
            keys.w = true;
            break;
        case 'KeyA':
            keys.a = true;
            break;
        case 'KeyS':
            keys.s = true;
            break;
        case 'KeyD':
            keys.d = true;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            keys.shift = true;
            break;
    }
}

function onKeyUp(event) {
    switch(event.code) {
        case 'KeyW':
            keys.w = false;
            break;
        case 'KeyA':
            keys.a = false;
            break;
        case 'KeyS':
            keys.s = false;
            break;
        case 'KeyD':
            keys.d = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            keys.shift = false;
            break;
    }
}

function updateMovement() {
    if (!gameState.gameStarted || gameState.gameWon) return;
    
    // 현재 속도 결정 (Shift로 달리기)
    const currentSpeed = keys.shift ? runSpeed : moveSpeed;
    
    // 이동 벡터 초기화
    const moveVector = new THREE.Vector3(0, 0, 0);
    
    // 카메라의 방향 벡터들 계산
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    
    // 카메라 회전 적용 (Y축 회전만 - 수평 이동을 위해)
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.yaw);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.yaw);
    
    // 키 입력에 따른 이동
    if (keys.w) moveVector.add(forward);
    if (keys.s) moveVector.sub(forward);
    if (keys.d) moveVector.add(right);
    if (keys.a) moveVector.sub(right);
    
    // 대각선 이동 시 속도 정규화
    if (moveVector.length() > 0) {
        moveVector.normalize();
        moveVector.multiplyScalar(currentSpeed);
        
        // 카메라 위치 업데이트
        camera.position.add(moveVector);
        
        // 벽 충돌 체크
        camera.position.x = Math.max(-4.5, Math.min(4.5, camera.position.x));
        camera.position.z = Math.max(-4.5, Math.min(4.5, camera.position.z));
        camera.position.y = 1.6; // 고정 높이
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function addToInventory(item) {
    if (!gameState.inventory.includes(item)) {
        gameState.inventory.push(item);
        updateInventoryDisplay();
    }
}

function updateInventoryDisplay() {
    const itemsDiv = document.getElementById('items');
    itemsDiv.innerHTML = '';
    gameState.inventory.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.textContent = '• ' + item;
        itemsDiv.appendChild(itemDiv);
    });
}

function showMessage(text) {
    document.getElementById('messageText').textContent = text;
    const messageDiv = document.getElementById('message');
    messageDiv.style.display = 'block';
    
    // 메시지가 표시될 때 클릭 이벤트 리스너 추가
    const closeOnClick = (event) => {
        // 메시지 영역 외부 클릭이나 메시지 영역 클릭 시 닫기
        closeMessage();
        document.removeEventListener('click', closeOnClick);
        event.stopPropagation();
    };
    
    // 약간의 지연 후 이벤트 리스너 추가 (즉시 닫히는 것을 방지)
    setTimeout(() => {
        document.addEventListener('click', closeOnClick);
    }, 100);
}

function closeMessage() {
    document.getElementById('message').style.display = 'none';
}

function startGame() {
    gameState.gameStarted = true;
    
    // 포인터 락 설정
    const canvas = renderer.domElement;
    
    // 포인터 락 요청 함수 정의
    const requestPointerLock = () => {
        canvas.requestPointerLock = canvas.requestPointerLock ||
                                   canvas.mozRequestPointerLock ||
                                   canvas.webkitRequestPointerLock;
        if (canvas.requestPointerLock) {
            canvas.requestPointerLock();
        }
    };
    
    // 캔버스 클릭 시 포인터 락 요청
    canvas.addEventListener('click', () => {
        if (!gameState.gameWon && gameState.gameStarted) {
            requestPointerLock();
        }
    });
    
    // 포인터 락 상태 변경 이벤트 리스너
    const onPointerLockChange = () => {
        if (document.pointerLockElement === canvas ||
            document.mozPointerLockElement === canvas ||
            document.webkitPointerLockElement === canvas) {
            console.log('포인터 락 활성화 - 마우스가 화면 중앙에 고정됨');
        } else {
            console.log('포인터 락 비활성화 - ESC를 눌러 해제됨');
        }
    };
    
    // 포인터 락 에러 이벤트 리스너
    const onPointerLockError = () => {
        console.log('포인터 락 요청 실패');
    };
    
    // 이벤트 리스너 등록
    document.addEventListener('pointerlockchange', onPointerLockChange, false);
    document.addEventListener('mozpointerlockchange', onPointerLockChange, false);
    document.addEventListener('webkitpointerlockchange', onPointerLockChange, false);
    
    document.addEventListener('pointerlockerror', onPointerLockError, false);
    document.addEventListener('mozpointerlockerror', onPointerLockError, false);
    document.addEventListener('webkitpointerlockerror', onPointerLockError, false);
    
    // 초기 카메라 설정
    camera.rotation.order = 'YXZ';
    cameraRotation.yaw = 0;
    cameraRotation.pitch = 0;
    
    // 타이머 시작
    startTimer();
    
    showMessage('방탈출 게임에 오신 것을 환영합니다! 화면을 클릭하여 마우스를 고정하고 시작하세요. WASD로 이동, Shift로 달리기, ESC로 마우스 해제!');
}

function startTimer() {
    const timerInterval = setInterval(() => {
        if (gameState.gameWon) {
            clearInterval(timerInterval);
            return;
        }
        
        gameState.timeLeft--;
        
        if (gameState.timeLeft <= 0) {
            clearInterval(timerInterval);
            showMessage('시간이 다 되었습니다! 게임 오버!');
            gameState.gameStarted = false;
            return;
        }
        
        const minutes = Math.floor(gameState.timeLeft / 60);
        const seconds = gameState.timeLeft % 60;
        document.getElementById('timer').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function animate() {
    requestAnimationFrame(animate);
    
    // 이동 업데이트
    updateMovement();
    
    // 승리 조건 체크
    if (gameState.gameWon && gameState.gameStarted) {
        // 승리 애니메이션이나 효과를 여기에 추가할 수 있습니다
        gameState.gameStarted = false;
    }
    
    renderer.render(scene, camera);
}

// 게임 시작
init();