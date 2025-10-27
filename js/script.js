// TwinWorks 웹사이트 메인 JavaScript

class TwinWorksApp {
    constructor() {
        this.liveDataInterval = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.initializeScrollAnimations();
        this.initializeCounters();
        this.initializeTabs();
        this.initializeDemoTabs();
        this.startLiveDataSimulation();
        this.createScrollIndicator();
    }

    setupEventListeners() {
        // 네비게이션 스크롤
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                this.scrollToSection(targetId);
            });
        });

        // 폼 제출 이벤트
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => this.handleContactForm(e));
        }

        const demoForm = document.getElementById('demo-form');
        if (demoForm) {
            demoForm.addEventListener('submit', (e) => this.handleDemoForm(e));
        }

        // 윈도우 스크롤 이벤트
        window.addEventListener('scroll', () => {
            this.updateScrollProgress();
            this.updateActiveNavigation();
        });

        // 리사이즈 이벤트
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    initializeScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                }
            });
        }, observerOptions);

        // 애니메이션 대상 요소들 관찰
        document.querySelectorAll('.feature-card, .stat, .card, .alert').forEach(el => {
            el.classList.add('fade-in-up');
            observer.observe(el);
        });
    }

    initializeCounters() {
        const counters = document.querySelectorAll('.counter');
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(counter => {
            counterObserver.observe(counter);
        });
    }

    animateCounter(element) {
        const target = parseInt(element.dataset.target);
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;

        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current);
        }, 16);
    }

    initializeTabs() {
        const tabs = document.querySelectorAll('.tabs .tab[data-tab]');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchFeatureTab(tab.dataset.tab);
            });
        });
    }

    switchFeatureTab(tabId) {
        // 탭 활성화
        document.querySelectorAll('.tabs .tab').forEach(tab => {
            tab.classList.remove('tab-active');
        });
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('tab-active');

        // 패널 전환
        document.querySelectorAll('.feature-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabId}-content`).classList.add('active');
    }

    initializeDemoTabs() {
        const demoTabs = document.querySelectorAll('.tabs .tab[data-demo]');
        demoTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchDemoTab(tab.dataset.demo);
            });
        });
    }

    switchDemoTab(demoId) {
        // 탭 활성화
        document.querySelectorAll('.tabs .tab[data-demo]').forEach(tab => {
            tab.classList.remove('tab-active');
        });
        document.querySelector(`[data-demo="${demoId}"]`).classList.add('tab-active');

        // 패널 전환
        document.querySelectorAll('.demo-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${demoId}-demo`).classList.add('active');
    }

    scrollToSection(sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
            const offsetTop = element.offsetTop - 80; // 네비게이션 높이 고려
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }

    updateScrollProgress() {
        const scrollProgress = document.querySelector('.scroll-progress');
        if (scrollProgress) {
            const scrollTop = window.pageYOffset;
            const docHeight = document.body.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;
            scrollProgress.style.width = scrollPercent + '%';
        }
    }

    updateActiveNavigation() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        
        let currentSection = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionTop + sectionHeight) {
                currentSection = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }

    createScrollIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'scroll-indicator';
        indicator.innerHTML = '<div class="scroll-progress"></div>';
        document.body.appendChild(indicator);
    }

    // 실시간 데이터 시뮬레이션
    startLiveDataSimulation() {
        this.liveDataInterval = setInterval(() => {
            this.updateLiveData();
        }, 2000);
    }

    updateLiveData() {
        const dataElements = {
            'live-temp': (24 + Math.random() * 2).toFixed(1),
            'live-pressure': (1.1 + Math.random() * 0.2).toFixed(1),
            'live-power': (80 + Math.random() * 20).toFixed(1),
            'live-efficiency': Math.floor(90 + Math.random() * 10)
        };

        Object.entries(dataElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.parentElement.classList.add('pulse-effect');
                setTimeout(() => {
                    element.parentElement.classList.remove('pulse-effect');
                }, 500);
            }
        });
    }

    // 기능 데모 표시
    showFeatureDemo(feature) {
        const demoContent = {
            'nocode': '노코드 프로그래밍 데모를 시작합니다. 드래그 앤 드롭으로 제어 로직을 구성해보세요.',
            '3d-model': '3D 모델 기반 제어 데모를 시작합니다. 실제 장비 모델과 상호작용해보세요.',
            'virtual': '가상 커미셔닝 데모를 시작합니다. 시스템을 가상으로 검증해보세요.',
            'realtime': '실시간 데이터 통합 데모를 시작합니다. 라이브 데이터를 확인해보세요.'
        };

        this.showNotification(demoContent[feature] || '데모를 시작합니다.', 'info');
    }

    // 폼 처리
    async handleContactForm(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // 로딩 상태 표시
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading-spinner"></div>문의 전송 중...';
        submitBtn.disabled = true;

        try {
            // 실제 환경에서는 서버로 데이터 전송
            await this.simulateFormSubmission();
            
            this.showNotification('문의가 성공적으로 전송되었습니다. 빠른 시일 내에 연락드리겠습니다.', 'success');
            e.target.reset();
        } catch (error) {
            this.showNotification('문의 전송 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleDemoForm(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading-spinner"></div>예약 요청 중...';
        submitBtn.disabled = true;

        try {
            await this.simulateFormSubmission();
            
            this.showNotification('데모 예약이 성공적으로 요청되었습니다. 담당자가 연락드리겠습니다.', 'success');
            e.target.reset();
            document.getElementById('demo-modal').close();
        } catch (error) {
            this.showNotification('예약 요청 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    simulateFormSubmission() {
        return new Promise((resolve) => {
            setTimeout(resolve, 2000); // 2초 지연으로 서버 통신 시뮬레이션
        });
    }

    // 알림 표시
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} fixed top-20 right-4 z-50 max-w-md shadow-lg`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="btn btn-sm btn-ghost" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(notification);

        // 5초 후 자동 제거
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // 반응형 처리
    handleResize() {
        // 모바일에서 네비게이션 메뉴 닫기
        if (window.innerWidth > 1024) {
            const dropdown = document.querySelector('.dropdown-content');
            if (dropdown) {
                dropdown.classList.remove('dropdown-open');
            }
        }
    }

    // 테마 전환
    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // 로컬 스토리지에서 테마 로드
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
}

// 전역 함수들 (HTML에서 직접 호출)
function scrollToSection(sectionId) {
    app.scrollToSection(sectionId);
}

function openDemoModal() {
    document.getElementById('demo-modal').showModal();
}

function showFeatureDemo(feature) {
    app.showFeatureDemo(feature);
}

// 앱 초기화
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TwinWorksApp();
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (app && app.liveDataInterval) {
        clearInterval(app.liveDataInterval);
    }
});

// 서비스 워커 등록 (PWA 지원)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// 에러 핸들링
window.addEventListener('error', (e) => {
    console.error('JavaScript Error:', e.error);
    // 프로덕션 환경에서는 에러 로깅 서비스로 전송
});

// 성능 모니터링
window.addEventListener('load', () => {
    if ('performance' in window) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log('Page load time:', loadTime + 'ms');
    }
});

export { TwinWorksApp };