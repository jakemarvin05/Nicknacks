import Vue from 'vue'

import ViewUI from 'view-design'
Vue.use(ViewUI, { locale })

import VueRouter from 'vue-router'
Vue.use(VueRouter)

import Routers from './router'
import Util from './helpers/util'
import App from './app.vue'
import 'view-design/dist/styles/iview.css'
import locale from 'view-design/dist/locale/en-US'
import D from 'dottie'
import moment from 'moment-timezone'

import Element from 'element-ui'
Vue.use(Element, { locale: El_locale })
import El_locale from 'element-ui/lib/locale/lang/en'

import VueJsonPretty from 'vue-json-pretty'
Vue.use(VueJsonPretty)
Vue.component('vue-json-pretty', VueJsonPretty)

import Vuex from 'vuex'
Vue.use(Vuex)

import ApexCharts from 'vue-apexcharts'
Vue.component('apexchart', ApexCharts)

import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.crossDomain = true

import VueWindowSize from 'vue-window-size'
Vue.use(VueWindowSize)

//filters
Vue.filter('unixToDate', value => {
    var str
    if (typeof value === 'number') {
        str = value.toString()
    } else {
        str = value
    }

    if (str.length === 10) {
        str += '000'
    } else if (str.length !== 13) {
        return undefined
    }

    return moment(parseInt(str)).tz('Asia/Singapore').format('DD MMM YYYY');
})
//filters
Vue.filter('timestampToDate', value => {
    return moment(value).tz('Asia/Singapore').format('DD MMM YYYY HH:mm')
})
Vue.filter('toTwoDecimals', value => {
    return (Math.round(value*100)/100).toFixed(2)
})
Vue.mixin({
    data: function() {
        return {
            get DOMAIN() {
                return process.env.API_DOMAIN
            },
            get AXIOS() {
                return axios
            }
        }
    }
})

// 路由配置
const RouterConfig = {
    mode: 'history',
    routes: Routers,
    base: '/'
}
const router = new VueRouter(RouterConfig)



router.beforeEach((to, from, next) => {
    ViewUI.LoadingBar.start()
    Util.title(to.meta.title)
    next();
})

router.afterEach((to, from, next) => {
    ViewUI.LoadingBar.finish()
    window.scrollTo(0, 0)

    Vue.nextTick( () => {
        document.title = to.meta.title ? to.meta.title : 'Nicknacks'
    })
})

const store = new Vuex.Store({
    state: {
        isAuthenticated: false,
        user: {}
    },
    mutations: {
        authenticated (state, payload) {
            state.isAuthenticated = true
            state.user = payload
        },
        logout (state) {

            axios.post(process.env.API_DOMAIN + '/api/v2/login/logout').then(response => {
                if (!response.data.success) {
                    let error = new Error('API operation not successful.')
                    error.response = response
                    throw error
                }

                state.isAuthenticated = false
                state.user = {}

            }).catch(error => {
                // fail silently
                state.isAuthenticated = false
                state.user = {}
            })


        }
    }
})

new Vue({
    el: '#app',
    store,
    router: router,
    render: h => h(App)
})

const CatchErrorHandler = (function(store) {

    return function(err) {
        let response = D.get(err , 'response')

        //if this is an api response
        //TODO: AXIOS error handling sucks.... it breaks the promise chain on 404
        if (response) {

            if (response.status === 401) {
                store.commit('logout')
                return
            }

            if (response.status === 403) {
                return alert('Oops. Looks like you don\'t have enough rights to access this resource.')
            }

            console.log(response)
            alert(D.get(response, 'data.message'))

        } else {
            console.log('Please screenshot the follow error to the administrator:')
            console.log(JSON.stringify(err))
            alert(err)
        }
    }

})(store)

window.CATCH_ERR_HANDLER = CatchErrorHandler
